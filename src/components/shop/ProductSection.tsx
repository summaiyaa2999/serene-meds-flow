import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { inr, type Product } from "@/lib/shop";
import { useCart, useProducts } from "@/hooks/use-shop";

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  return (
    <article className="reveal group relative flex flex-col overflow-hidden rounded-3xl border bg-card p-6 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow text-[0.6rem]">{product.category}</p>
          <h3 className="mt-2 font-display text-2xl leading-tight">{product.name}</h3>
          {product.sanskrit && (
            <p className="mt-1 text-sm text-muted-foreground">{product.sanskrit}</p>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-full">
          {product.pack}
        </Badge>
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

      <div className="mt-6 flex items-end justify-between gap-3 border-t pt-5">
        <div>
          <p className="font-display text-2xl text-primary">{inr(product.price)}</p>
          {product.mrp && product.mrp > product.price && (
            <p className="text-xs text-muted-foreground line-through">{inr(product.mrp)}</p>
          )}
        </div>
        <Button
          size="sm"
          className="rounded-full px-5"
          disabled={!product.inStock}
          onClick={onAdd}
        >
          {product.inStock ? (
            <>
              <Plus className="mr-1 h-4 w-4" /> Add
            </>
          ) : (
            "Sold out"
          )}
        </Button>
      </div>
    </article>
  );
}

export function ProductSection() {
  const { products } = useProducts();
  const { add } = useCart();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );

  const filtered = products.filter(
    (p) =>
      (active === "All" || p.category === active) &&
      (p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <section id="shop" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-6 sm:py-32">
      <div className="reveal max-w-2xl">
        <p className="eyebrow">The apothecary</p>
        <h2 className="mt-4 font-display text-4xl sm:text-5xl">Every remedy, one scroll away</h2>
        <p className="mt-4 text-muted-foreground">
          Classical formulations prepared in small batches. Add what you need — checkout takes under
          a minute with online payment or cash on delivery.
        </p>
      </div>

      <div className="glass sticky top-24 z-30 mt-10 flex flex-col gap-4 rounded-3xl p-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Triphala, Ashwagandha, hair oil…"
            className="h-11 rounded-full border-transparent bg-background/70 pl-11"
          />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-widest transition-colors ${
                active === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onAdd={() => {
              add(p.id);
              toast.success(`${p.name} added to cart`);
            }}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-16 text-center text-muted-foreground">No remedies match that search.</p>
      )}
    </section>
  );
}
