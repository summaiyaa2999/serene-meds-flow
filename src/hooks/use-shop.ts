import { useCallback, useEffect, useState } from "react";
import { store, DEFAULT_SETTINGS, type CartLine, type Settings, type Order } from "@/lib/shop";
import { supabase } from "@/integrations/supabase/client";

function useStoreValue<T>(getter: () => T, initial: T) {
  // Start from a hydration-safe value; real (localStorage) value lands after mount.
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const sync = () => setValue(getter());
    sync();
    window.addEventListener("dawaiin:store", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("dawaiin:store", sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}


export function useSettings() {
  const settings = useStoreValue<Settings>(store.getSettings, DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    async function syncFromDb() {
      try {
        if (!supabase) return;
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .eq("id", "default")
          .maybeSingle();

        if (error) {
          console.warn("Supabase settings sync notice:", error.message);
          return;
        }

        if (data && active) {
          const fresh: Settings = {
            whatsappNumber: data.whatsapp_number || DEFAULT_SETTINGS.whatsappNumber,
            cashfreeAppId: data.cashfree_app_id || "",
            cashfreeMode: (data.cashfree_mode?.toUpperCase() === "SANDBOX" ? "SANDBOX" : "PRODUCTION") as "SANDBOX" | "PRODUCTION",
            shippingFee: Number(data.shipping_fee) ?? DEFAULT_SETTINGS.shippingFee,
            freeShippingAbove: Number(data.free_shipping_above) ?? DEFAULT_SETTINGS.freeShippingAbove,
          };
          store.setSettings(fresh);
        }
      } catch (err) {
        console.warn("Could not sync settings from database:", err);
      }
    }
    void syncFromDb();
    return () => {
      active = false;
    };
  }, []);

  return { settings, setSettings: store.setSettings };
}

export function useOrders() {
  const orders = useStoreValue<Order[]>(store.getOrders, []);
  return { orders, setOrders: store.setOrders };
}

export function useCart() {
  const lines = useStoreValue<CartLine[]>(store.getCart, []);

  // Quantities are always whole, positive and capped — never trust a stray value.
  const sanitize = (qty: number) => Math.min(99, Math.max(0, Math.floor(Number(qty) || 0)));

  const add = useCallback((id: string, qty = 1, productDetails?: { name?: string; price?: number; pack?: string; category?: string }) => {
    const amount = sanitize(qty) || 1;
    const current = store.getCart();
    const found = current.find((l) => l.id === id);
    store.setCart(
      found
        ? current.map((l) => (l.id === id ? { ...l, ...productDetails, qty: sanitize(l.qty + amount) || 1 } : l))
        : [...current, { id, qty: amount, ...productDetails }],
    );
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    const amount = sanitize(qty);
    const current = store.getCart();
    store.setCart(
      amount <= 0 ? current.filter((l) => l.id !== id) : current.map((l) => (l.id === id ? { ...l, qty: amount } : l)),
    );
  }, []);

  const remove = useCallback((id: string) => setQty(id, 0), [setQty]);
  const clear = useCallback(() => store.setCart([]), []);

  const totalItemsCount =
    Array.isArray(lines) && lines.length > 0
      ? lines.reduce(
          (sum, item) =>
            sum + Math.max(0, Math.floor(Number(item?.qty || (item as any)?.quantity) || 0)),
          0
        )
      : 0;

  return {
    lines,
    items: lines,
    add,
    setQty,
    remove,
    clear,
    count: totalItemsCount,
    totalItemsCount,
  };
}

export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    const observeAll = () => {
      document.querySelectorAll<HTMLElement>(".reveal:not(.in-view)").forEach((el) => io.observe(el));
    };

    observeAll();

    // Content rendered later (e.g. products loaded from the backend) must also be observed.
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);
}


export function useParallax() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const onScroll = () => setY(window.scrollY);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return y;
}
