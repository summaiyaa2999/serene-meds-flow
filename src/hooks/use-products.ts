import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/shop";

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
    id: r.id,
    name: r.name,
    sanskrit: r.sanskrit,
    category: r.category,
    price: Number(r.price),
    mrp: r.mrp === null ? null : Number(r.mrp),
    pack: r.pack,
    description: r.description,
    imageUrl: r.image_url,
    inStock: r.in_stock,
    sortOrder: r.sort_order,
  };
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load products:", error.message);
      setError(error.message);
    } else {
      setError(null);
      setProducts((data as unknown as Row[]).map(rowToProduct));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel(`products-changes-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { products, loading, error, refresh };
}
