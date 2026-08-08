import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer, MessageCircle, Trash2, Plus, Save, Lock, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrders, useSettings } from "@/hooks/use-shop";
import { useProducts } from "@/hooks/use-products";
import { supabase } from "@/integrations/supabase/client";
import { buildOrderMessage, inr, whatsappLink, type Product, type Order } from "@/lib/shop";
import { ImageUploadButton } from "@/components/shop/ImageUploadButton";

export const Route = createFileRoute("/admin")({
  ssr: false,
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

type Draft = {
  name: string;
  sanskrit: string;
  category: string;
  price: string;
  mrp: string;
  pack: string;
  description: string;
  imageUrl: string;
};

const BLANK: Draft = {
  name: "",
  sanskrit: "",
  category: "General",
  price: "",
  mrp: "",
  pack: "",
  description: "",
  imageUrl: "",
};

function AuthGate({ onReady }: { onReady: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function submit() {
    setBusy(true);
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/admin` },
          });
    const { data, error } = await fn;
    setBusy(false);
    if (error) return toast.error(error.message);
    if (mode === "signup" && !data.session) {
      return toast.success("Account created — check your email to confirm, then sign in.");
    }
    onReady();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-cream px-5">
      <div className="glass w-full max-w-sm rounded-3xl p-8 text-center">
        <Lock className="mx-auto h-6 w-6 text-primary" />
        <h1 className="mt-4 font-display text-3xl">Admin access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin" ? "Sign in to manage the store." : "Create the store admin account."}
        </p>
        <Input
          type="email"
          placeholder="Email"
          className="mt-6"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          className="mt-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
        />
        <Button className="mt-4 w-full rounded-full" disabled={busy} onClick={() => void submit()}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
        <button
          className="mt-4 block w-full text-xs uppercase tracking-widest text-muted-foreground"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Create admin account" : "I already have an account"}
        </button>
        <Link to="/" className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">
          Back to store
        </Link>
      </div>
    </div>
  );
}

function Admin() {
  const { settings, setSettings } = useSettings();
  const { products, refresh, loading } = useProducts();
  const { orders, setOrders } = useOrders();
  const [dbOrders, setDbOrders] = useState<Order[]>([]);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [form, setForm] = useState(settings);
  const [status, setStatus] = useState<"loading" | "out" | "notadmin" | "in">("loading");

  const fetchDbOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      const parsed: Order[] = data.map((row) => ({
        id: row.order_number || row.id,
        createdAt: row.created_at,
        customer: {
          name: row.customer_name,
          phone: row.customer_phone,
          address: row.delivery_address,
          city: "",
          pincode: "",
        },
        items: Array.isArray(row.items) ? (row.items as any) : [],
        subtotal: Number(row.subtotal),
        shipping: Number(row.shipping),
        total: Number(row.total),
        payment: "cod",
        status: row.status as any,
      }));
      setDbOrders(parsed);
    }
  }, []);

  const check = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setStatus("out");
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin");
    const isAdmin = Boolean(roles && roles.length > 0);
    setStatus(isAdmin ? "in" : "notadmin");
    if (isAdmin) void fetchDbOrders();
  }, [fetchDbOrders]);

  useEffect(() => {
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void check());
    return () => sub.subscription.unsubscribe();
  }, [check]);

  const allOrders = useMemo(() => {
    const map = new Map<string, Order>();
    for (const o of orders) map.set(o.id, o);
    for (const o of dbOrders) {
      if (!map.has(o.id)) map.set(o.id, o);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [orders, dbOrders]);

  useEffect(() => setForm(settings), [settings]);

  async function addProduct() {
    if (!draft.name.trim() || !draft.price) return toast.error("Name and price are required");
    const { error } = await supabase.from("products").insert({
      name: draft.name.trim(),
      sanskrit: draft.sanskrit.trim() || null,
      category: draft.category.trim() || "General",
      price: Number(draft.price),
      mrp: draft.mrp ? Number(draft.mrp) : null,
      pack: draft.pack.trim(),
      description: draft.description.trim(),
      image_url: draft.imageUrl.trim() || null,
    });
    if (error) return toast.error(error.message);
    setDraft(BLANK);
    await refresh();
    toast.success("Product added");
  }

  type ProductPatch = {
    name?: string;
    category?: string;
    pack?: string;
    description?: string;
    price?: number;
    image_url?: string | null;
    in_stock?: boolean;
  };

  async function updateProduct(id: string, patch: ProductPatch) {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    await refresh();
  }

  async function deleteProduct(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Product deleted");
  }

  if (status === "loading") {
    return <div className="grid min-h-screen place-items-center bg-cream text-muted-foreground">Loading…</div>;
  }

  if (status === "out") return <AuthGate onReady={() => void check()} />;

  if (status === "notadmin") {
    return (
      <div className="grid min-h-screen place-items-center bg-cream px-5 text-center">
        <div className="glass max-w-sm rounded-3xl p-8">
          <h1 className="font-display text-3xl">No admin access</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This account is not an administrator of the store.
          </p>
          <Button
            variant="outline"
            className="mt-6 rounded-full"
            onClick={() => void supabase.auth.signOut()}
          >
            Sign out
          </Button>
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
          <div className="flex gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/">View store</Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => void supabase.auth.signOut()} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <Tabs defaultValue="products">
          <TabsList className="rounded-full">
            <TabsTrigger value="products" className="rounded-full">Products ({products.length})</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-full">Orders ({allOrders.length})</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-6 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="h-fit rounded-3xl border bg-card p-6">
              <h2 className="font-display text-2xl">Add a medicine</h2>
              <div className="mt-4 space-y-3">
                <div><Label>Name</Label><Input className="mt-1" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
                <div><Label>Other / local name</Label><Input className="mt-1" value={draft.sanskrit} onChange={(e) => setDraft({ ...draft, sanskrit: e.target.value })} /></div>
                <div><Label>Category</Label><Input className="mt-1" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Price (₹)</Label><Input type="number" className="mt-1" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></div>
                  <div><Label>MRP (₹)</Label><Input type="number" className="mt-1" value={draft.mrp} onChange={(e) => setDraft({ ...draft, mrp: e.target.value })} /></div>
                </div>
                <div><Label>Pack</Label><Input className="mt-1" placeholder="100 g / 60 tablets" value={draft.pack} onChange={(e) => setDraft({ ...draft, pack: e.target.value })} /></div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label>Product photo</Label>
                    <ImageUploadButton onUploaded={(url) => setDraft({ ...draft, imageUrl: url })} />
                  </div>
                  <Input className="mt-1" placeholder="Upload a photo or paste an image URL" value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} />
                  {draft.imageUrl ? <img src={draft.imageUrl} alt="Preview of the product photo" className="mt-2 h-24 w-24 rounded-xl object-cover" /> : null}
                </div>
                <div><Label>Description</Label><Textarea rows={3} className="mt-1" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
                <Button className="w-full rounded-full" onClick={() => void addProduct()}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add product
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{loading ? "Loading…" : `${products.length} medicines`}</p>
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => void refresh()}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
                </Button>
              </div>
              {products.length === 0 && !loading && (
                <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
                  No medicines yet. Add your first one on the left.
                </p>
              )}
              {products.map((p: Product) => (
                <div key={p.id} className="rounded-2xl border bg-card p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                    <div className="min-w-0">
                      <Input
                        className="h-9 font-medium"
                        defaultValue={p.name}
                        onBlur={(e) => e.target.value !== p.name && void updateProduct(p.id, { name: e.target.value })}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">{p.category} · {p.pack || "—"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Input
                        type="number"
                        className="h-9 w-24"
                        defaultValue={p.price}
                        onBlur={(e) =>
                          Number(e.target.value) !== p.price && void updateProduct(p.id, { price: Number(e.target.value) })
                        }
                      />
                      <Button
                        size="sm"
                        variant={p.inStock ? "secondary" : "outline"}
                        className="rounded-full"
                        onClick={() => void updateProduct(p.id, { in_stock: !p.inStock })}
                      >
                        {p.inStock ? "In stock" : "Sold out"}
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => void deleteProduct(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Input
                      className="h-9"
                      placeholder="Category"
                      defaultValue={p.category}
                      onBlur={(e) => e.target.value !== p.category && void updateProduct(p.id, { category: e.target.value })}
                    />
                    <Input
                      className="h-9"
                      placeholder="Pack"
                      defaultValue={p.pack}
                      onBlur={(e) => e.target.value !== p.pack && void updateProduct(p.id, { pack: e.target.value })}
                    />
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Input
                        key={p.imageUrl ?? "none"}
                        className="h-9 flex-1"
                        placeholder="Upload a photo or paste an image URL"
                        defaultValue={p.imageUrl ?? ""}
                        onBlur={(e) =>
                          e.target.value !== (p.imageUrl ?? "") && void updateProduct(p.id, { image_url: e.target.value || null })
                        }
                      />
                      <ImageUploadButton label="Upload" onUploaded={(url) => void updateProduct(p.id, { image_url: url })} />
                    </div>
                    <Textarea
                      rows={2}
                      className="sm:col-span-2"
                      placeholder="Description"
                      defaultValue={p.description}
                      onBlur={(e) =>
                        e.target.value !== p.description && void updateProduct(p.id, { description: e.target.value })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-6 space-y-4">
            {allOrders.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
            {allOrders.map((o) => (
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
