import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag, Leaf, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart, useSettings } from "@/hooks/use-shop";

const NAV = [
  { label: "Home", href: "#home" },
  { label: "Apothecary", href: "#shop" },
  { label: "Our Roots", href: "#about" },
  { label: "Visit Us", href: "#contact" },
];

export function SiteHeader({ onCartOpen }: { onCartOpen: () => void }) {
  const { count } = useCart();
  const { settings } = useSettings();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="hidden bg-primary/95 py-2 text-primary-foreground sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6">
          <p className="eyebrow text-primary-foreground/80">
            Since 1978 · Classical Ayurveda, ethically sourced
          </p>
          <p className="eyebrow text-primary-foreground/80">
            Free delivery above ₹{settings.freeShippingAbove} · GMP certified
          </p>
        </div>
      </div>

      <div
        className={`transition-all duration-500 ${
          scrolled ? "glass shadow-[var(--shadow-soft)]" : "bg-transparent"
        }`}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 sm:px-6">
          <a href="#home" className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[image:var(--gradient-leaf)] text-primary-foreground shadow-[var(--shadow-soft)]">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-2xl leading-none">Dawaiin</span>
              <span className="eyebrow hidden text-[0.6rem] sm:block">Ayurvedic Apothecary</span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            <nav className="mr-2 hidden items-center gap-7 lg:flex">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  className="text-sm font-medium text-foreground/75 transition-colors hover:text-primary"
                >
                  {n.label}
                </a>
              ))}
            </nav>

            <Button variant="outline" size="icon" className="rounded-full" onClick={onCartOpen} aria-label="Open cart">
              <span className="relative">
                <ShoppingBag className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -right-2.5 -top-2.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-clay px-1 text-[10px] font-semibold text-clay-foreground">
                    {count}
                  </span>
                )}
              </span>
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="glass w-[86vw] max-w-sm border-l p-8">
                <p className="eyebrow">Navigate</p>
                <nav className="mt-8 flex flex-col gap-6">
                  {NAV.map((n) => (
                    <a
                      key={n.href}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="font-display text-3xl text-foreground transition-colors hover:text-primary"
                    >
                      {n.label}
                    </a>
                  ))}
                </nav>
                <div className="mt-10 space-y-3 border-t pt-6 text-sm text-muted-foreground">
                  <a className="flex items-center gap-2" href={`tel:+${settings.whatsappNumber}`}>
                    <Phone className="h-4 w-4" /> +{settings.whatsappNumber}
                  </a>
                  <Link to="/admin" className="block text-xs uppercase tracking-widest">
                    Admin panel
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
