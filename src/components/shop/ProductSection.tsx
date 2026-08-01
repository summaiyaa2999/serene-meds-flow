import { useMemo, useState } from "react";
import { Plus, Search, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { buildProductEnquiry, inr, whatsappLink, SHIPPING_NOTE, type Product } from "@/lib/shop";
import { useCart, useSettings } from "@/hooks/use-shop";
import { useProducts } from "@/hooks/use-products";

function ProductCard({
  product,
  onAdd,
  whatsappNumber,
}: {
  product: Product;
  onAdd: () => void;
  whatsappNumber: string;
}) {
  return (
    <article className="reveal group relative flex flex-col overflow-hidden rounded-3xl border bg-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)]">
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-48 w-full object-cover"
        />
      )}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow text-[0.6rem]">{product.category}</p>
            <h3 className="mt-2 font-display text-2xl leading-tight">{product.name}</h3>
            {product.sanskrit && <p className="mt-1 text-sm text-muted-foreground">{product.sanskrit}</p>}
          </div>
          {product.pack && (
            <Badge variant="secondary" className="shrink-0 rounded-full">
              {product.pack}
            </Badge>
          )}
        </div>

        {product.description && (
          <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
        )}

        <div className="mt-6 flex items-end justify-between gap-3 border-t pt-5">
          <div>
            <p className="font-display text-2xl text-primary">{inr(product.price)}</p>
            {product.mrp && product.mrp > product.price && (
              <p className="text-xs text-muted-foreground line-through">{inr(product.mrp)}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="rounded-full"
              aria-label={`Order ${product.name} on WhatsApp`}
              asChild
            >
              <a
                href={whatsappLink(whatsappNumber, buildProductEnquiry(product))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </Button>
            <Button size="sm" className="rounded-full px-5" disabled={!product.inStock} onClick={onAdd}>
              {product.inStock ? (
                <>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </>
              ) : (
                "Sold out"
              )}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductSection() {
  const { products, loading } = useProducts();
  const { settings } = useSettings();
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
    <section id="shop" className="relative mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
      <div className="reveal max-w-2xl">
        <p className="eyebrow">The apothecary</p>
        <h2 className="mt-3 font-display text-4xl sm:text-5xl">
          Pure remedies rooted in Ayurveda and Unani traditions.
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">{SHIPPING_NOTE}</p>
      </div>

      <div className="glass sticky top-24 z-30 mt-8 flex flex-col gap-4 rounded-3xl p-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medicines…"
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

      {loading ? (
        <div className="mt-12 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading medicines…
        </div>
      ) : products.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed bg-card/50 p-12 text-center">
          <p className="font-display text-2xl">Our catalogue is being updated.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Medicines will appear here soon. Meanwhile, message us on WhatsApp for any requirement.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <a
              href={whatsappLink(settings.whatsappNumber, "Hello Dawaiin, I would like to enquire about a medicine.")}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Enquire on WhatsApp
            </a>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                whatsappNumber={settings.whatsappNumber}
                onAdd={() => {
                  add(p.id);
                  toast.success(`${p.name} added to cart`);
                }}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="mt-12 text-center text-muted-foreground">No medicines match that search.</p>
          )}
        </>
      )}
    </section>
  );
}
