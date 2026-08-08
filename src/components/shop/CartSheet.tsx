import { useMemo, useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, MessageCircle, CreditCard, Lock, Loader2, User, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart, useSettings, useOrders } from "@/hooks/use-shop";
import { useProducts, rowToProduct } from "@/hooks/use-products";
import { supabase } from "@/integrations/supabase/client";
import {
  buildWhatsAppReceipt,
  buildWhatsAppDirectUrl,
  buildOrderMessage,
  inr,
  openWhatsApp,
  whatsappLinks,
  WHATSAPP_NUMBER,
  type Customer,
  type Order,
  type Product,
} from "@/lib/shop";
import { payWithRazorpay } from "@/lib/razorpay";

const EMPTY: Customer = { name: "", phone: "", address: "", city: "", pincode: "", notes: "" };

export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lines, setQty, remove, clear } = useCart();
  const { products, loading: productsLoading, error: productsError } = useProducts();
  const { settings } = useSettings();
  const { orders, setOrders } = useOrders();
  const [customer, setCustomer] = useState<Customer>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    name?: boolean;
    phone?: boolean;
    address?: boolean;
    city?: boolean;
    pincode?: boolean;
  }>({});

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

  function validateCustomer(): boolean {
    const errors: { name?: boolean; phone?: boolean; address?: boolean; city?: boolean; pincode?: boolean } = {};
    if (!customer.name.trim()) errors.name = true;
    if (!customer.phone.trim()) errors.phone = true;
    if (!customer.address.trim()) errors.address = true;
    if (!customer.city.trim()) errors.city = true;
    if (!customer.pincode.trim()) errors.pincode = true;

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("Please fill in all required customer and delivery details.");
      return false;
    }
    return true;
  }

  async function handleWhatsAppOrder() {
    if (!canCheckout) return toast.error("Product prices are still loading. Please wait a moment.");
    if (!validateCustomer()) return;

    setBusy(true);
    try {
      // 1. Backend Lock: Verify price from database
      const { priced, sub, ship, grand } = await priceFromDatabase();

      // 2. Order Reference Number
      const generatedOrderNum = "ORD-" + Math.floor(1000 + Math.random() * 9000);
      const fullDeliveryAddress = `${customer.address.trim()}, ${customer.city.trim()} - ${customer.pincode.trim()}`;

      // 3. Save Order to Supabase Database
      const { data: insertedOrder, error: dbError } = await supabase
        .from("orders")
        .insert({
          order_number: generatedOrderNum,
          customer_name: customer.name.trim(),
          customer_phone: customer.phone.trim(),
          delivery_address: fullDeliveryAddress,
          items: priced.map((i) => ({ name: i.name, pack: i.pack, qty: i.qty, price: i.price })),
          subtotal: sub,
          shipping: ship,
          total: grand,
          status: "Pending WhatsApp Confirmation",
        })
        .select()
        .single();

      if (dbError) {
        console.error("Supabase order insert error:", dbError);
        throw new Error("Could not save order to database: " + dbError.message);
      }

      const orderId = insertedOrder?.order_number || generatedOrderNum;

      // 4. Update local state history
      const localOrder: Order = {
        id: orderId,
        createdAt: insertedOrder?.created_at || new Date().toISOString(),
        customer,
        items: priced,
        subtotal: sub,
        shipping: ship,
        total: grand,
        payment: "cod",
        status: "new",
      };
      setOrders([localOrder, ...orders]);

      // 5. Build WhatsApp Receipt
      const formattedMessage = buildWhatsAppReceipt({
        orderId,
        customerName: customer.name.trim(),
        customerPhone: customer.phone.trim(),
        deliveryAddress: fullDeliveryAddress,
        items: priced.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
        subtotal: sub,
        shipping: ship,
        total: grand,
      });

      // 6. Format shopkeeper phone & build target WhatsApp URL
      const shopkeeperPhone = settings.whatsappNumber || WHATSAPP_NUMBER;
      const whatsappUrl = buildWhatsAppDirectUrl(shopkeeperPhone, formattedMessage);

      // 7. Clear Shopping Cart & Reset State
      clear();
      setCustomer(EMPTY);
      setValidationErrors({});
      onOpenChange(false);
      toast.success(`Order #${orderId} saved! Redirecting to WhatsApp…`);

      // 8. Instant Redirection Handoff
      window.location.href = whatsappUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process order.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRazorpayOrder() {
    if (!canCheckout) return toast.error("Product prices are still loading. Please wait a moment.");
    if (!validateCustomer()) return;

    setBusy(true);
    try {
      const { priced, sub, ship, grand } = await priceFromDatabase();

      if (!settings.razorpayKeyId) {
        return toast.error("Online payment is not configured yet. Add a Razorpay Key ID in the admin panel.");
      }

      const fullDeliveryAddress = `${customer.address.trim()}, ${customer.city.trim()} - ${customer.pincode.trim()}`;

      const paymentId = await payWithRazorpay({
        keyId: settings.razorpayKeyId,
        amount: grand,
        name: customer.name,
        contact: customer.phone,
        description: `Dawaiin order · ${priced.length} items`,
      });

      const generatedOrderNum = "ORD-" + Math.floor(1000 + Math.random() * 9000);

      const { data: insertedOrder } = await supabase
        .from("orders")
        .insert({
          order_number: generatedOrderNum,
          customer_name: customer.name.trim(),
          customer_phone: customer.phone.trim(),
          delivery_address: fullDeliveryAddress,
          items: priced.map((i) => ({ name: i.name, pack: i.pack, qty: i.qty, price: i.price })),
          subtotal: sub,
          shipping: ship,
          total: grand,
          status: "Paid Online (Razorpay)",
        })
        .select()
        .single();

      const orderId = insertedOrder?.order_number || generatedOrderNum;

      const order: Order = {
        id: orderId,
        createdAt: new Date().toISOString(),
        customer,
        items: priced,
        subtotal: sub,
        shipping: ship,
        total: grand,
        payment: "razorpay",
        paymentId,
        status: "new",
      };

      setOrders([order, ...orders]);
      const message = buildOrderMessage(order);
      const number = settings.whatsappNumber || WHATSAPP_NUMBER;
      await openWhatsApp(whatsappLinks(number, message));
      clear();
      setCustomer(EMPTY);
      onOpenChange(false);
      toast.success("Order placed successfully via Razorpay!");
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
          <p className="eyebrow">Your selection</p>
          <SheetTitle className="font-display text-3xl">Shopping bag</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {items.length === 0 ? (
            <div className="grid h-48 place-items-center text-center">
              <div>
                <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Your bag is empty.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Itemized List */}
              <div className="space-y-3">
                <p className="eyebrow text-xs uppercase tracking-wider text-muted-foreground">Cart Items ({items.length})</p>
                <ul className="space-y-3">
                  {items.map((i) => (
                    <li key={i.id} className="flex items-start gap-4 rounded-2xl border bg-card p-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg">{i.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {i.pack} · {inr(i.price)}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => setQty(i.id, i.qty - 1)}
                            disabled={busy}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-6 text-center text-sm">{i.qty}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => setQty(i.id, i.qty + 1)}
                            disabled={busy}
                          >
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
                          disabled={busy}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Customer Information Collection */}
              <div className="rounded-2xl border bg-card p-5 space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-lg">Customer Information</h3>
                </div>

                <div>
                  <Label htmlFor="customer-name" className="text-xs font-semibold">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="customer-name"
                      placeholder="e.g., Ananya Sharma"
                      value={customer.name}
                      onChange={(e) => {
                        setCustomer({ ...customer, name: e.target.value });
                        if (validationErrors.name) setValidationErrors((prev) => ({ ...prev, name: false }));
                      }}
                      className={validationErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                  </div>
                  {validationErrors.name && <p className="mt-1 text-xs text-destructive">Full Name is required.</p>}
                </div>

                <div>
                  <Label htmlFor="customer-phone" className="text-xs font-semibold">
                    Contact Phone Number (WhatsApp) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="customer-phone"
                      inputMode="tel"
                      placeholder="e.g., 9876543210"
                      value={customer.phone}
                      onChange={(e) => {
                        setCustomer({ ...customer, phone: e.target.value });
                        if (validationErrors.phone) setValidationErrors((prev) => ({ ...prev, phone: false }));
                      }}
                      className={validationErrors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                  </div>
                  {validationErrors.phone && <p className="mt-1 text-xs text-destructive">Contact Phone Number is required.</p>}
                </div>

                {/* Structured Delivery Address Section */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Delivery Address</span>
                  </div>

                  <div>
                    <Label htmlFor="street-address" className="text-xs font-medium text-muted-foreground">
                      Flat / House No., Building & Street Address <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="street-address"
                      rows={2}
                      placeholder="e.g., House 42, Green Park Main Road, Near Civil Hospital"
                      value={customer.address}
                      onChange={(e) => {
                        setCustomer({ ...customer, address: e.target.value });
                        if (validationErrors.address) setValidationErrors((prev) => ({ ...prev, address: false }));
                      }}
                      className={`mt-1 ${validationErrors.address ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {validationErrors.address && <p className="mt-1 text-xs text-destructive">Street address is required.</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="customer-city" className="text-xs font-medium text-muted-foreground">
                        City / State <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="customer-city"
                        placeholder="e.g., New Delhi, DL"
                        value={customer.city}
                        onChange={(e) => {
                          setCustomer({ ...customer, city: e.target.value });
                          if (validationErrors.city) setValidationErrors((prev) => ({ ...prev, city: false }));
                        }}
                        className={`mt-1 ${validationErrors.city ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      />
                      {validationErrors.city && <p className="mt-1 text-xs text-destructive">City / State is required.</p>}
                    </div>

                    <div>
                      <Label htmlFor="customer-pincode" className="text-xs font-medium text-muted-foreground">
                        Pincode <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="customer-pincode"
                        inputMode="numeric"
                        placeholder="e.g., 110016"
                        value={customer.pincode}
                        onChange={(e) => {
                          setCustomer({ ...customer, pincode: e.target.value });
                          if (validationErrors.pincode) setValidationErrors((prev) => ({ ...prev, pincode: false }));
                        }}
                        className={`mt-1 ${validationErrors.pincode ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      />
                      {validationErrors.pincode && <p className="mt-1 text-xs text-destructive">Pincode is required.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </>
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

            <div className="mt-3 space-y-2">
              <Button
                className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                size="lg"
                disabled={!canCheckout || busy}
                onClick={() => void handleWhatsAppOrder()}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Order…
                  </>
                ) : (
                  <>
                    <MessageCircle className="mr-2 h-5 w-5" /> Order on WhatsApp
                  </>
                )}
              </Button>

              {settings.razorpayKeyId ? (
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  size="lg"
                  disabled={busy || !canCheckout}
                  onClick={() => void handleRazorpayOrder()}
                >
                  <CreditCard className="mr-2 h-4 w-4" /> Pay {inr(total)} online
                </Button>
              ) : null}
            </div>

            <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Live catalog pricing verified securely before order dispatch.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
