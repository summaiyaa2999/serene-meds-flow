import { useMemo, useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, MessageCircle, CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart, useSettings, useOrders } from "@/hooks/use-shop";
import { useProducts, rowToProduct } from "@/hooks/use-products";
import { supabase } from "@/integrations/supabase/client";

import { buildOrderMessage, inr, openWhatsApp, whatsappLink, WHATSAPP_NUMBER, type Customer, type Order, type Product } from "@/lib/shop";
import { payWithRazorpay } from "@/lib/razorpay";

const EMPTY: Customer = { name: "", phone: "", address: "", city: "", pincode: "", notes: "" };

type Step = "cart" | "details" | "review";

export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lines, setQty, remove, clear } = useCart();
  const { products, loading: productsLoading, error: productsError } = useProducts();
  const { settings } = useSettings();
  const { orders, setOrders } = useOrders();
  const [step, setStep] = useState<Step>("cart");
  const [customer, setCustomer] = useState<Customer>(EMPTY);
  const [busy, setBusy] = useState(false);

  const items = useMemo(
    () =>
      lines
        .map((l) => {
          const p = products.find((x) => x.id === l.id);
          const qty = Math.min(99, Math.max(1, Math.floor(Number(l.qty) || 0)));
          return p ? { ...p, qty } : null;
        })
        .filter(Boolean) as (Product & { qty: number })[],
    [lines, products],
  );

  const priceIssue = items.some((i) => !Number.isFinite(i.price) || i.price <= 0);
  const missingRows = !productsLoading && !productsError && items.length !== lines.length;
  const canCheckout = items.length > 0 && !productsLoading && !productsError && !priceIssue && !missingRows;

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal === 0 || subtotal >= settings.freeShippingAbove ? 0 : settings.shippingFee;
  const total = subtotal + shipping;

  const valid =
    customer.name.trim().length > 1 &&
    /^[0-9]{10}$/.test(customer.phone.replace(/\D/g, "").slice(-10)) &&
    customer.address.trim().length > 5 &&
    customer.city.trim().length > 1 &&
    /^[0-9]{6}$/.test(customer.pincode.trim());

  /** Re-reads prices straight from the database so the total can never be tampered with. */
  async function priceFromDatabase() {
    const ids = items.map((i) => i.id);
    const { data, error } = await supabase.from("products").select("*").in("id", ids);
    if (error) throw new Error("Could not verify prices right now. Please try again.");
    const fresh = (data ?? []).map((r) => rowToProduct(r as never));

    const priced = items.map((i) => {
      const p = fresh.find((f) => f.id === i.id);
      if (!p || !Number.isFinite(p.price) || p.price <= 0) {
        throw new Error(`Price unavailable for ${i.name}. Please remove it and try again.`);
      }
      return { name: p.name, pack: p.pack, qty: i.qty, price: p.price };
    });

    const sub = priced.reduce((s, i) => s + i.price * i.qty, 0);
    const ship = sub >= settings.freeShippingAbove ? 0 : settings.shippingFee;
    return { priced, sub, ship, grand: sub + ship };
  }

  async function placeOrder(payment: "razorpay" | "cod") {
    if (!canCheckout) return toast.error("Product prices are still loading. Please wait a moment.");
    if (!valid) return toast.error("Please complete all delivery details");
    // Opened during the click so the browser does not treat it as a blocked popup later.
    const waTab = typeof window !== "undefined" ? window.open("", "_blank") : null;
    setBusy(true);
    try {
      const { priced, sub, ship, grand } = await priceFromDatabase();

      let paymentId: string | undefined;
      if (payment === "razorpay") {
        if (!settings.razorpayKeyId) {
          waTab?.close();
          setBusy(false);
          return toast.error("Online payment is not configured yet. Add a Razorpay Key ID in the admin panel.");
        }
        paymentId = await payWithRazorpay({
          keyId: settings.razorpayKeyId,
          amount: grand,
          name: customer.name,
          contact: customer.phone,
          description: `Dawaiin order · ${priced.length} items`,
        });
      }

      const order: Order = {
        id: "DWN" + Date.now().toString().slice(-8),
        createdAt: new Date().toISOString(),
        customer,
        items: priced,
        subtotal: sub,
        shipping: ship,
        total: grand,
        payment,
        paymentId,
        status: "new",
      };

      setOrders([order, ...orders]);
      const number = (settings.whatsappNumber || "").replace(/\D/g, "") || WHATSAPP_NUMBER;
      openWhatsApp(whatsappLink(number, buildOrderMessage(order)), waTab);
      clear();
      setCustomer(EMPTY);
      setStep("cart");
      onOpenChange(false);
      toast.success("Order placed — details sent to WhatsApp");
    } catch (e) {
      waTab?.close();
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-lg flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-5">
          <p className="eyebrow">
            {step === "cart" ? "Your selection" : step === "details" ? "Delivery details" : "Confirm your order"}
          </p>
          <SheetTitle className="font-display text-3xl">
            {step === "cart" ? "Shopping bag" : step === "details" ? "Where do we send it?" : "Order summary"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === "cart" && (
            items.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Your bag is empty.</p>
                </div>
              </div>
            ) : (
              <ul className="space-y-4">
                {items.map((i) => (
                  <li key={i.id} className="flex items-start gap-4 rounded-2xl border bg-card p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.pack} · {inr(i.price)}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setQty(i.id, i.qty - 1)}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm">{i.qty}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setQty(i.id, i.qty + 1)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{inr(i.price * i.qty)}</p>
                      <button
                        onClick={() => remove(i.id)}
                        className="mt-3 text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={`Remove ${i.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {step === "details" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="c-name">Full name</Label>
                <Input id="c-name" className="mt-1.5" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="c-phone">Mobile number (WhatsApp)</Label>
                <Input id="c-phone" inputMode="tel" className="mt-1.5" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="c-addr">Delivery address</Label>
                <Textarea id="c-addr" rows={3} className="mt-1.5" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="c-city">City / State</Label>
                  <Input id="c-city" className="mt-1.5" value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="c-pin">Pincode</Label>
                  <Input id="c-pin" inputMode="numeric" className="mt-1.5" value={customer.pincode} onChange={(e) => setCustomer({ ...customer, pincode: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="c-note">Notes (optional)</Label>
                <Input id="c-note" className="mt-1.5" value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} />
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-5">
              <div className="rounded-2xl border bg-card p-4 text-sm">
                <p className="eyebrow mb-2">Ship to</p>
                <p className="font-medium">{customer.name}</p>
                <p className="text-muted-foreground">{customer.address}</p>
                <p className="text-muted-foreground">
                  {customer.city} — {customer.pincode}
                </p>
                <p className="text-muted-foreground">Mobile: {customer.phone}</p>
                {customer.notes ? <p className="text-muted-foreground">Note: {customer.notes}</p> : null}
              </div>

              <div className="rounded-2xl border bg-card p-4">
                <p className="eyebrow mb-3">Order</p>
                <ul className="space-y-2 text-sm">
                  {items.map((i, idx) => (
                    <li key={i.id} className="flex justify-between gap-3">
                      <span className="min-w-0">
                        {idx + 1}. {i.name} × {i.qty}
                      </span>
                      <span className="whitespace-nowrap font-medium">{inr(i.price * i.qty)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Prices and the total are locked to our catalogue and cannot be edited.
              </p>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="glass space-y-3 border-t px-6 py-5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{inr(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Shipping</span>
              <span>{shipping === 0 ? "Free" : inr(shipping)}</span>
            </div>
            <div className="flex justify-between font-display text-2xl">
              <span>Total</span>
              <span className="text-primary">{inr(total)}</span>
            </div>

            {!canCheckout && (
              <p className="text-xs text-destructive">
                {productsLoading ? "Loading live prices…" : "Some prices could not be loaded. Checkout is paused."}
              </p>
            )}

            {step === "cart" && (
              <Button className="mt-2 w-full rounded-full" size="lg" disabled={!canCheckout} onClick={() => setStep("details")}>
                <MessageCircle className="mr-2 h-4 w-4" /> Order on WhatsApp
              </Button>
            )}

            {step === "details" && (
              <div className="mt-2 space-y-2">
                <Button
                  className="w-full rounded-full"
                  size="lg"
                  disabled={!canCheckout || !valid}
                  onClick={() => setStep("review")}
                >
                  Review order
                </Button>
                <button className="w-full pt-1 text-xs uppercase tracking-widest text-muted-foreground" onClick={() => setStep("cart")}>
                  Back to bag
                </button>
              </div>
            )}

            {step === "review" && (
              <div className="mt-2 space-y-2">
                <Button className="w-full rounded-full" size="lg" disabled={busy || !canCheckout} onClick={() => placeOrder("cod")}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Send Order on WhatsApp
                </Button>
                <Button variant="outline" className="w-full rounded-full" size="lg" disabled={busy || !canCheckout} onClick={() => placeOrder("razorpay")}>
                  <CreditCard className="mr-2 h-4 w-4" /> Pay {inr(total)} online
                </Button>
                <button className="w-full pt-1 text-xs uppercase tracking-widest text-muted-foreground" onClick={() => setStep("details")}>
                  Edit details
                </button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
