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

export type CartLine = { id: string; qty: number; name?: string; price?: number; pack?: string; category?: string };

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

/**
 * Turns a pasted link into a direct image link when possible.
 * Search-result pages (Bing / Google Images) are not images, but they carry the
 * real image address in a query parameter — we extract it so the picture shows.
 * Returns null when the link cannot be used as an image source.
 */
export function normalizeImageUrl(raw?: string | null): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (value.startsWith("data:image/")) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  for (const key of ["mediaurl", "mediaUrl", "imgurl", "imgUrl", "url", "image_url"]) {
    const nested = url.searchParams.get(key);
    if (nested) {
      try {
        const decoded = new URL(decodeURIComponent(nested));
        if (decoded.protocol === "http:" || decoded.protocol === "https:") return decoded.toString();
      } catch {
        /* ignore and fall through */
      }
    }
  }

  // A search-results page with no extractable image is not usable as an <img> source.
  if (/^\/(search|images\/search)/i.test(url.pathname)) return null;

  return url.toString();
}


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
  getCart: () => {
    const raw = read<unknown>(KEYS.cart, []);
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (item): item is CartLine =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as any).id === "string" &&
        Boolean((item as any).id.trim()) &&
        Number((item as any).qty || (item as any).quantity) > 0
    );
  },
  setCart: (c: CartLine[]) => {
    const validLines = Array.isArray(c)
      ? c.filter(
          (item) =>
            Boolean(item?.id) &&
            Boolean(String(item.id).trim()) &&
            Number(item.qty || (item as any)?.quantity) > 0
        )
      : [];

    if (validLines.length === 0) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(KEYS.cart);
        window.dispatchEvent(new CustomEvent("dawaiin:store"));
      }
    } else {
      write(KEYS.cart, validLines);
    }
  },
};

export const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export type ReceiptParams = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  shipping: number;
  total: number;
};

export function buildWhatsAppReceipt(params: ReceiptParams): string {
  const itemLines = params.items
    .map((item) => `- ${item.name} x ${item.qty} - ₹${item.price}`)
    .join("\n");

  return [
    "--------------------------------",
    `📦 NEW ORDER: #${params.orderId}`,
    "--------------------------------",
    "👤 Customer Details:",
    `Name: ${params.customerName}`,
    `Phone: ${params.customerPhone}`,
    `Address: ${params.deliveryAddress}`,
    "",
    "🛒 Items Ordered:",
    itemLines,
    "",
    "💰 Bill Summary:",
    `Subtotal: ₹${params.subtotal}`,
    `Shipping: ₹${params.shipping}`,
    "--------------------------------",
    `TOTAL AMOUNT DUE: ₹${params.total}`,
    "--------------------------------",
    `(Please verify #${params.orderId} in admin panel before dispatch)`,
  ].join("\n");
}

export function formatShopkeeperPhone(phone: string): string {
  const digits = (phone || "").replace(/[^0-9]/g, "");
  if (!digits) return WHATSAPP_NUMBER;
  return digits.length === 10 ? `91${digits}` : digits;
}

export function buildWhatsAppDirectUrl(phone: string, formattedMessage: string): string {
  const cleanShopkeeperPhone = formatShopkeeperPhone(phone);
  return `https://wa.me/${cleanShopkeeperPhone}?text=${encodeURIComponent(formattedMessage)}`;
}

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

function normalizeNumber(number: string) {
  const digits = (number || "").replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits || WHATSAPP_NUMBER;
}

/** Ordered list of WhatsApp URLs to try, best-first for the current device. */
export function whatsappLinks(number: string, message: string) {
  const n = normalizeNumber(number);
  const text = encodeURIComponent(message);
  const deepLink = `whatsapp://send?phone=${n}&text=${text}`;
  const web = `https://web.whatsapp.com/send?phone=${n}&text=${text}&type=phone_number&app_absent=0`;
  const shortLink = `https://wa.me/${n}?text=${text}`;

  const isMobile =
    typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  return isMobile ? [deepLink, web, shortLink] : [web, shortLink];
}

/** Universal direct chat link. Keeping this as a real anchor preserves the
 * browser's trusted click and avoids popup blockers. */
export function whatsappLink(number: string, message: string) {
  const n = normalizeNumber(number);
  return `https://web.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
}

/**
 * Opens WhatsApp immediately from the user's click. Pass a synchronously opened
 * tab when async checkout work must finish before the destination is known.
 */
export async function openWhatsApp(urls: string[], win?: Window | null): Promise<boolean> {
  if (typeof window === "undefined" || urls.length === 0) return false;

  if (win && !win.closed) {
    try {
      win.location.href = urls[0];
      return true;
    } catch {
      try {
        win.location.href = urls[1] ?? urls[0];
        return true;
      } catch {
        win.close();
        return false;
      }
    }
  }

  const opened = window.open(urls[0], "_blank", "noopener,noreferrer");
  if (opened) return true;

  // Popup was blocked: use the current tab so the order can still proceed.
  try {
    window.location.assign(urls[0]);
    return true;
  } catch {
    return false;
  }
}

