import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer, MessageCircle, Trash2, Plus, Save, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrders, useProducts, useSettings } from "@/hooks/use-shop";
import { buildOrderMessage, inr, whatsappLink, type Product, type Order } from "@/lib/shop";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Dawaiin Ayurvedic Apothecary" },
      { name: "description", content: "Manage Dawaiin products, orders, WhatsApp dispatch slips and Razorpay settings." },
      { property: "og:title", content: "Admin Panel — Dawaiin" },
      { property: "og:description", content: "Manage products, orders and payment settings for the Dawaiin store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function printSlip(order: Order) {
  const html = `<html><head><title>${order.id}</title><style>
    body{font-family:ui-sans-serif,system-ui;padding:24px;max-width:420px}
    h1{font-size:18px;margin:0 0 4px} .m{color:#555;font-size:12px}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
    td{padding:4px 0;border-bottom:1px dashed #ccc} .r{text-align:right}
    .box{border:1px solid #333;padding:14px;border-radius:8px;margin-top:12px}
  </style></head><body>
    <h1>DAWAIIN — Dispatch Slip</h1>
    <div class="m">Order ${order.id} · ${new Date(order.createdAt).toLocaleString("en-IN")}</div>
    <div class="box"><strong>${order.customer.name}</strong><br/>${order.customer.address}<br/>
    ${order.customer.city} - ${order.customer.pincode}<br/>Phone: ${order.customer.phone}</div>
    <table>${order.items
      .map((i) => `<tr><td>${i.name} (${i.pack}) x${i.qty}</td><td class="r">${inr(i.price * i.qty)}</td></tr>`)
      .join("")}
      <tr><td>Shipping</td><td class="r">${order.shipping === 0 ? "FREE" : inr(order.shipping)}</td></tr>
      <tr><td><strong>TOTAL</strong></td><td class="r"><strong>${inr(order.total)}</strong></td></tr>
    </table>
    <p class="m">${order.payment === "razorpay" ? "PAID ONLINE · " + (order.paymentId ?? "") : "CASH ON DELIVERY"}</p>
  </body></html>`;
  const w = window.open("", "_blank", "width=520,height=720");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.print();
}

const BLANK: Product = {
  id: "",
  name: "",
  category: "Classical Churna",
  price: 0,
  pack: "",
  description: "",
  inStock: true,
};

function Admin() {
  const { settings, setSettings } = useSettings();
  const { products, setProducts } = useProducts();
  const { orders, setOrders } = useOrders();
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [draft, setDraft] = useState<Product>(BLANK);
  const [form, setForm] = useState(settings);

  if (!authed) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream px-5">
        <div className="glass w-full max-w-sm rounded-3xl p-8 text-center">
          <Lock className="mx-auto h-6 w-6 text-primary" />
          <h1 className="mt-4 font-display text-3xl">Admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your store PIN to continue.</p>
          <Input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setAuthed(pin === settings.adminPin)}
            className="mt-6 text-center"
            placeholder="••••"
          />
          <Button
            className="mt-4 w-full rounded-full"
            onClick={() => (pin === settings.adminPin ? setAuthed(true) : toast.error("Incorrect PIN"))}
          >
            Unlock
          </Button>
          <Link to="/" className="mt-5 block text-xs uppercase tracking-widest text-muted-foreground">
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-24">
      <header className="glass sticky top-0 z-40 border-b">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="eyebrow">Dawaiin control room</p>
            <h1 className="truncate font-display text-2xl">Admin panel</h1>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/">View store</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <Tabs defaultValue="orders">
          <TabsList className="rounded-full">
            <TabsTrigger value="orders" className="rounded-full">Orders ({orders.length})</TabsTrigger>
            <TabsTrigger value="products" className="rounded-full">Products ({products.length})</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6 space-y-4">
            {orders.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
            {orders.map((o) => (
              <div key={o.id} className="rounded-3xl border bg-card p-6">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-xl">{o.id}</p>
                      <Badge variant={o.payment === "razorpay" ? "default" : "secondary"} className="rounded-full">
                        {o.payment === "razorpay" ? "Paid online" : "COD"}
                      </Badge>
                      <Badge variant="outline" className="rounded-full capitalize">{o.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <p className="font-display text-2xl text-primary">{inr(o.total)}</p>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-muted/60 p-4 text-sm">
                    <p className="font-medium">{o.customer.name}</p>
                    <p className="mt-1 text-muted-foreground">{o.customer.address}</p>
                    <p className="text-muted-foreground">{o.customer.city} - {o.customer.pincode}</p>
                    <p className="text-muted-foreground">{o.customer.phone}</p>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {o.items.map((i) => (
                      <li key={i.name} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">{i.name} ×{i.qty}</span>
                        <span className="shrink-0">{inr(i.price * i.qty)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => printSlip(o)}>
                    <Printer className="mr-1.5 h-4 w-4" /> Print slip
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => window.open(whatsappLink(settings.whatsappNumber, buildOrderMessage(o)), "_blank")}
                  >
                    <MessageCircle className="mr-1.5 h-4 w-4" /> Resend to WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() =>
                      setOrders(
                        orders.map((x) =>
                          x.id === o.id
                            ? { ...x, status: x.status === "new" ? "packed" : x.status === "packed" ? "dispatched" : "new" }
                            : x,
                        ),
                      )
                    }
                  >
                    Mark next status
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-destructive"
                    onClick={() => setOrders(orders.filter((x) => x.id !== o.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="products" className="mt-6 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="rounded-3xl border bg-card p-6">
              <h2 className="font-display text-2xl">Add a medicine</h2>
              <div className="mt-4 space-y-3">
                <div><Label>Name</Label><Input className="mt-1" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
                <div><Label>Category</Label><Input className="mt-1" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Price (₹)</Label><Input type="number" className="mt-1" value={draft.price || ""} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></div>
                  <div><Label>Pack</Label><Input className="mt-1" value={draft.pack} onChange={(e) => setDraft({ ...draft, pack: e.target.value })} /></div>
                </div>
                <div><Label>Description</Label><Textarea rows={3} className="mt-1" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
                <Button
                  className="w-full rounded-full"
                  onClick={() => {
                    if (!draft.name || !draft.price) return toast.error("Name and price are required");
                    setProducts([{ ...draft, id: "p" + Date.now() }, ...products]);
                    setDraft(BLANK);
                    toast.success("Product added");
                  }}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add product
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {products.map((p) => (
                <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border bg-card p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category} · {p.pack}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Input
                      type="number"
                      className="h-9 w-24"
                      value={p.price}
                      onChange={(e) =>
                        setProducts(products.map((x) => (x.id === p.id ? { ...x, price: Number(e.target.value) } : x)))
                      }
                    />
                    <Button
                      size="sm"
                      variant={p.inStock ? "secondary" : "outline"}
                      className="rounded-full"
                      onClick={() => setProducts(products.map((x) => (x.id === p.id ? { ...x, inStock: !x.inStock } : x)))}
                    >
                      {p.inStock ? "In stock" : "Sold out"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setProducts(products.filter((x) => x.id !== p.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="max-w-xl space-y-4 rounded-3xl border bg-card p-6">
              <div>
                <Label>WhatsApp number (with country code, digits only)</Label>
                <Input className="mt-1" value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} />
              </div>
              <div>
                <Label>Razorpay Key ID (rzp_live_… / rzp_test_…)</Label>
                <Input className="mt-1" value={form.razorpayKeyId} onChange={(e) => setForm({ ...form, razorpayKeyId: e.target.value })} />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Only the public Key ID goes here. Never paste your Razorpay secret key.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Shipping fee (₹)</Label><Input type="number" className="mt-1" value={form.shippingFee} onChange={(e) => setForm({ ...form, shippingFee: Number(e.target.value) })} /></div>
                <div><Label>Free shipping above (₹)</Label><Input type="number" className="mt-1" value={form.freeShippingAbove} onChange={(e) => setForm({ ...form, freeShippingAbove: Number(e.target.value) })} /></div>
              </div>
              <div>
                <Label>Admin PIN</Label>
                <Input className="mt-1" value={form.adminPin} onChange={(e) => setForm({ ...form, adminPin: e.target.value })} />
              </div>
              <Button className="rounded-full" onClick={() => { setSettings(form); toast.success("Settings saved"); }}>
                <Save className="mr-1.5 h-4 w-4" /> Save settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
