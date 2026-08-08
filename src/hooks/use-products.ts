import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeImageUrl, type Product } from "@/lib/shop";

type Row = {
  id: string;
  name: string;
  sanskrit: string | null;
  category: string;
  price: number | string;
  mrp: number | string | null;
  pack: string;
  description: string;
  image_url: string | null;
  in_stock: boolean;
  sort_order: number;
};

export function rowToProduct(r: Row): Product {
  return {
    id: r?.id || "",
    name: r?.name || "Unnamed Product",
    sanskrit: r?.sanskrit || null,
    category: r?.category || "General",
    price: Number(r?.price) || 0,
    mrp: r?.mrp === null || r?.mrp === undefined ? null : Number(r.mrp) || null,
    pack: r?.pack || "",
    description: r?.description || "",
    imageUrl: normalizeImageUrl(r?.image_url),
    inStock: Boolean(r?.in_stock),
    sortOrder: Number(r?.sort_order) || 0,
  };
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to load products:", error.message);
        setError(error.message);
        setProducts([]);
      } else {
        setError(null);
        const rows = (data as unknown as Row[]) ?? [];
        setProducts(rows.map(rowToProduct));
      }
    } catch (err: any) {
      console.error("Network or execution error loading products:", err);
      setError(err?.message || "Failed to load products.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    let channel: any;
    try {
      channel = supabase
        .channel(`products-changes-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
          void refresh();
        })
        .subscribe();
    } catch (err) {
      console.warn("Failed to subscribe to realtime products channel:", err);
    }
    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { products, loading, error, refresh };
}
