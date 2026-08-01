export type Product = {
  id: string;
  name: string;
  sanskrit?: string | null;
  category: string;
  price: number;
  mrp?: number | null;
  pack: string;
  description: string;
  imageUrl?: string | null;
  inStock: boolean;
  sortOrder?: number;
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
};

export const WHATSAPP_NUMBER = "917078718575";

export const DEFAULT_SETTINGS: Settings = {
  whatsappNumber: WHATSAPP_NUMBER,
  razorpayKeyId: "",
  shippingFee: 30,
  freeShippingAbove: 500,
};

export const SHIPPING_NOTE = "Orders below ₹500 will have a ₹30 shipping cost.";

const KEYS = {
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

export function buildProductEnquiry(product: Product) {
  return [
    "*DAWAIIN — ORDER ENQUIRY*",
    "",
    `Medicine: ${product.name}`,
    product.pack ? `Pack: ${product.pack}` : "",
    `Price: ${inr(product.price)} (fixed)`,
    "",
    "Please confirm availability and delivery for this medicine.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function whatsappLink(number: string, message: string) {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
