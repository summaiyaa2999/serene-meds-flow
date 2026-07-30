export type Product = {
  id: string;
  name: string;
  sanskrit?: string;
  category: string;
  price: number;
  mrp?: number;
  pack: string;
  description: string;
  inStock: boolean;
};

export type CartLine = { id: string; qty: number };

export type Customer = {
  name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  notes?: string;
};

export type Order = {
  id: string;
  createdAt: string;
  customer: Customer;
  items: { name: string; pack: string; qty: number; price: number }[];
  subtotal: number;
  shipping: number;
  total: number;
  payment: "razorpay" | "cod";
  paymentId?: string;
  status: "new" | "packed" | "dispatched";
};

export type Settings = {
  whatsappNumber: string;
  razorpayKeyId: string;
  shippingFee: number;
  freeShippingAbove: number;
  adminPin: string;
};

export const DEFAULT_SETTINGS: Settings = {
  whatsappNumber: "919876543210",
  razorpayKeyId: "",
  shippingFee: 60,
  freeShippingAbove: 999,
  adminPin: "1234",
};

export const CATEGORIES = [
  "Classical Churna",
  "Immunity & Rasayana",
  "Digestive Care",
  "Joint & Muscle",
  "Skin & Hair",
  "Herbal Oils",
] as const;

export const DEFAULT_PRODUCTS: Product[] = [
  { id: "p1", name: "Triphala Churna", sanskrit: "त्रिफला चूर्ण", category: "Classical Churna", price: 240, mrp: 320, pack: "100 g", description: "Traditional three-fruit blend for gentle detox and daily digestive balance.", inStock: true },
  { id: "p2", name: "Ashwagandha Root Powder", sanskrit: "अश्वगंधा", category: "Immunity & Rasayana", price: 320, mrp: 420, pack: "100 g", description: "Adaptogenic root that supports stamina, calm focus and restful sleep.", inStock: true },
  { id: "p3", name: "Chyawanprash Classic", category: "Immunity & Rasayana", price: 480, mrp: 599, pack: "500 g", description: "Amla-rich rasayana slow-cooked with 40+ herbs and pure cow ghee.", inStock: true },
  { id: "p4", name: "Brahmi Vati", sanskrit: "ब्राह्मी वटी", category: "Immunity & Rasayana", price: 275, pack: "60 tablets", description: "Classical memory and mind tonic for clarity and mental stamina.", inStock: true },
  { id: "p5", name: "Hingvastak Churna", category: "Digestive Care", price: 190, mrp: 240, pack: "100 g", description: "Warming carminative churna for bloating, gas and sluggish appetite.", inStock: true },
  { id: "p6", name: "Avipattikar Churna", category: "Digestive Care", price: 210, pack: "100 g", description: "Cooling formula that calms hyperacidity and post-meal heaviness.", inStock: true },
  { id: "p7", name: "Kutajghan Vati", category: "Digestive Care", price: 230, pack: "60 tablets", description: "Time-tested support for loose motions and intestinal comfort.", inStock: true },
  { id: "p8", name: "Yogaraj Guggulu", category: "Joint & Muscle", price: 360, mrp: 450, pack: "80 tablets", description: "Guggulu formulation for joint mobility, stiffness and vata balance.", inStock: true },
  { id: "p9", name: "Mahanarayan Taila", category: "Herbal Oils", price: 420, pack: "200 ml", description: "Classical massage oil for aching joints, back and tired muscles.", inStock: true },
  { id: "p10", name: "Ksheerabala Taila", category: "Herbal Oils", price: 520, pack: "200 ml", description: "Milk-processed bala oil for nervine strength and deep relaxation.", inStock: true },
  { id: "p11", name: "Bhringraj Hair Oil", category: "Skin & Hair", price: 340, mrp: 420, pack: "200 ml", description: "Cold-processed bhringraj and amla oil for stronger, darker hair.", inStock: true },
  { id: "p12", name: "Kumkumadi Tailam", category: "Skin & Hair", price: 690, mrp: 850, pack: "30 ml", description: "Saffron-infused night elixir for glow, marks and even skin tone.", inStock: true },
  { id: "p13", name: "Neem Guduchi Tablets", category: "Skin & Hair", price: 260, pack: "60 tablets", description: "Blood-purifying duo for clear skin and healthy immune response.", inStock: true },
  { id: "p14", name: "Sitopaladi Churna", category: "Classical Churna", price: 180, pack: "60 g", description: "Household remedy for cough, cold and seasonal respiratory comfort.", inStock: true },
  { id: "p15", name: "Talisadi Churna", category: "Classical Churna", price: 195, pack: "60 g", description: "Balances kapha, eases chest congestion and supports digestion.", inStock: true },
  { id: "p16", name: "Giloy Ghanvati", category: "Immunity & Rasayana", price: 220, mrp: 280, pack: "60 tablets", description: "Concentrated guduchi extract for daily immune resilience.", inStock: true },
  { id: "p17", name: "Shatavari Powder", category: "Immunity & Rasayana", price: 330, pack: "100 g", description: "Nourishing women's tonic for hormonal balance and vitality.", inStock: true },
  { id: "p18", name: "Dashmoolarishta", category: "Digestive Care", price: 290, pack: "450 ml", description: "Fermented ten-root tonic for post-partum recovery and strength.", inStock: false },
  { id: "p19", name: "Punarnavadi Mandur", category: "Joint & Muscle", price: 250, pack: "60 tablets", description: "Supports healthy fluid balance, swelling and liver function.", inStock: true },
  { id: "p20", name: "Rasnadi Guggulu", category: "Joint & Muscle", price: 310, pack: "60 tablets", description: "Classical anti-stiffness formula for knees, shoulders and lower back.", inStock: true },
];

const KEYS = {
  products: "dawaiin.products",
  settings: "dawaiin.settings",
  orders: "dawaiin.orders",
  cart: "dawaiin.cart",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("dawaiin:store"));
}

export const store = {
  getProducts: () => read<Product[]>(KEYS.products, DEFAULT_PRODUCTS),
  setProducts: (p: Product[]) => write(KEYS.products, p),
  getSettings: () => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) }),
  setSettings: (s: Settings) => write(KEYS.settings, s),
  getOrders: () => read<Order[]>(KEYS.orders, []),
  setOrders: (o: Order[]) => write(KEYS.orders, o),
  getCart: () => read<CartLine[]>(KEYS.cart, []),
  setCart: (c: CartLine[]) => write(KEYS.cart, c),
};

export const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export function buildOrderMessage(order: Order) {
  const lines = order.items
    .map(
      (i, idx) =>
        `${idx + 1}. ${i.name} (${i.pack}) x${i.qty} — ${inr(i.price * i.qty)}`,
    )
    .join("\n");

  return [
    "*DAWAIIN — NEW ORDER*",
    `Order ID: ${order.id}`,
    `Date: ${new Date(order.createdAt).toLocaleString("en-IN")}`,
    "",
    "*SHIP TO*",
    order.customer.name,
    order.customer.address,
    `${order.customer.city} - ${order.customer.pincode}`,
    `Phone: ${order.customer.phone}`,
    order.customer.notes ? `Note: ${order.customer.notes}` : "",
    "",
    "*ITEMS*",
    lines,
    "",
    `Subtotal: ${inr(order.subtotal)}`,
    `Shipping: ${order.shipping === 0 ? "FREE" : inr(order.shipping)}`,
    `*TOTAL: ${inr(order.total)}*`,
    "",
    `Payment: ${order.payment === "razorpay" ? "PAID ONLINE (Razorpay)" : "CASH ON DELIVERY"}`,
    order.paymentId ? `Payment ID: ${order.paymentId}` : "",
    "",
    "— Please print & paste this slip on the parcel.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function whatsappLink(number: string, message: string) {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
