import { useMemo, useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, MessageCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart, useSettings, useOrders } from "@/hooks/use-shop";
import { useProducts } from "@/hooks/use-products";

import { buildOrderMessage, inr, whatsappLink, type Customer, type Order } from "@/lib/shop";
import { payWithRazorpay } from "@/lib/razorpay";

const EMPTY: Customer = { name: "", phone: "", address: "", city: "", pincode: "", notes: "" };

export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lines, setQty, remove, clear } = useCart();
  const { products } = useProducts();
  const { settings } = useSettings();
  const { orders, setOrders } = useOrders();
  const [step, setStep] = useState<"cart" | "details">("cart");
  const [customer, setCustomer] = useState<Customer>(EMPTY);
  const [busy, setBusy] = useState(false);

  const items = useMemo(
    () =>
      lines
        .map((l) => {
          const p = products.find((x) => x.id === l.id);
          return p ? { ...p, qty: l.qty } : null;
        })
        .filter(Boolean) as (typeof products[number] & { qty: number })[],
    [lines, products],
  );

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal === 0 || subtotal >= settings.freeShippingAbove ? 0 : settings.shippingFee;
  const total = subtotal + shipping;

  const valid =
    customer.name.trim().length > 1 &&
    /^[0-9]{10}$/.test(customer.phone.replace(/\D/g, "").slice(-10)) &&
    customer.address.trim().length > 5 &&
    customer.city.trim().length > 1 &&
    /^[0-9]{6}$/.test(customer.pincode.trim());

  async function placeOrder(payment: "razorpay" | "cod") {
    if (!valid) return toast.error("Please complete all delivery details");
    setBusy(true);
    try {
      let paymentId: string | undefined;
      if (payment === "razorpay") {
        if (!settings.razorpayKeyId) {
          setBusy(false);
          return toast.error("Online payment is not configured yet. Add a Razorpay Key ID in the admin panel.");
        }
        paymentId = await payWithRazorpay({
          keyId: settings.razorpayKeyId,
          amount: total,
          name: customer.name,
          contact: customer.phone,
          description: `Dawaiin order · ${items.length} items`,
        });
      }

      const order: Order = {
        id: "DWN" + Date.now().toString().slice(-8),
        createdAt: new Date().toISOString(),
        customer,
        items: items.map((i) => ({ name: i.name, pack: i.pack, qty: i.qty, price: i.price })),
        subtotal,
        shipping,
        total,
        payment,
        paymentId,
        status: "new",
      };

      setOrders([order, ...orders]);
      window.open(whatsappLink(settings.whatsappNumber, buildOrderMessage(order)), "_blank");
      clear();
      setCustomer(EMPTY);
      setStep("cart");
      onOpenChange(false);
      toast.success("Order placed — details sent to WhatsApp");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-lg flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-5">
          <p className="eyebrow">{step === "cart" ? "Your selection" : "Delivery details"}</p>
          <SheetTitle className="font-display text-3xl">
            {step === "cart" ? "Shopping bag" : "Where do we send it?"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === "cart" ? (
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
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="c-name">Full name</Label>
                <Input id="c-name" className="mt-1.5" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="c-phone">Phone (WhatsApp)</Label>
                <Input id="c-phone" inputMode="tel" className="mt-1.5" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="c-addr">Full address</Label>
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

            {step === "cart" ? (
              <Button className="mt-2 w-full rounded-full" size="lg" onClick={() => setStep("details")}>
                Continue to delivery
              </Button>
            ) : (
              <div className="mt-2 space-y-2">
                <Button className="w-full rounded-full" size="lg" disabled={busy} onClick={() => placeOrder("razorpay")}>
                  <CreditCard className="mr-2 h-4 w-4" /> Pay {inr(total)} securely
                </Button>
                <Button variant="outline" className="w-full rounded-full" size="lg" disabled={busy} onClick={() => placeOrder("cod")}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Order on WhatsApp (COD)
                </Button>
                <button className="w-full pt-1 text-xs uppercase tracking-widest text-muted-foreground" onClick={() => setStep("cart")}>
                  Back to bag
                </button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
