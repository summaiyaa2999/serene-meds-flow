declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => any;
  }
}

export interface CreateCashfreeOrderParams {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  returnUrl?: string;
}

export interface CashfreeOrderResponse {
  payment_session_id: string;
  order_id: string;
  cf_order_id?: string;
  order_status?: string;
}

/**
 * Dynamically ensures the Cashfree JS SDK v3 script is loaded.
 */
export async function loadCashfreeScript(): Promise<void> {
  if (typeof window === "undefined") return;
  if (typeof window.Cashfree !== "undefined") return;

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () =>
        reject(new Error("Failed to load Cashfree JS SDK"))
      );
      if (typeof window.Cashfree !== "undefined") {
        resolve();
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Cashfree JS SDK"));
    document.head.appendChild(script);
  });
}

/**
 * Get initialized Cashfree SDK instance for checkout modal.
 */
export async function getCashfreeInstance(mode?: "sandbox" | "production" | "SANDBOX" | "PRODUCTION") {
  await loadCashfreeScript();
  const rawMode =
    mode ||
    (typeof import.meta !== "undefined" && (import.meta.env?.VITE_CASHFREE_MODE || import.meta.env?.VITE_CASHFREE_ENV)) ||
    (typeof process !== "undefined" && (process.env?.CASHFREE_ENV || process.env?.CASHFREE_MODE)) ||
    "sandbox";

  const sdkMode: "sandbox" | "production" =
    String(rawMode).toLowerCase() === "production" ? "production" : "sandbox";

  if (typeof window.Cashfree !== "function") {
    throw new Error("Cashfree JS SDK is not available on window.");
  }

  return window.Cashfree({ mode: sdkMode });
}

/**
 * Request payment_session_id from Cashfree REST API (/pg/orders).
 */
export async function createCashfreeOrderSession(
  params: CreateCashfreeOrderParams,
  options?: {
    appId?: string;
    secretKey?: string;
    mode?: "sandbox" | "production" | "SANDBOX" | "PRODUCTION";
  }
): Promise<CashfreeOrderResponse> {
  const appId =
    options?.appId ??
    (typeof import.meta !== "undefined" ? import.meta.env?.VITE_CASHFREE_APP_ID : null) ??
    (typeof process !== "undefined" ? process.env?.CASHFREE_APP_ID || process.env?.VITE_CASHFREE_APP_ID || process.env?.CASHFREE_CLIENT_ID : null) ??
    ((globalThis as any).Deno?.env?.get ? (globalThis as any).Deno.env.get("CASHFREE_APP_ID") || (globalThis as any).Deno.env.get("VITE_CASHFREE_APP_ID") : null);

  const secretKey =
    options?.secretKey ??
    (typeof process !== "undefined" ? process.env?.CASHFREE_SECRET_KEY || process.env?.VITE_CASHFREE_SECRET_KEY : null) ??
    ((globalThis as any).Deno?.env?.get ? (globalThis as any).Deno.env.get("CASHFREE_SECRET_KEY") : null);

  const rawMode =
    options?.mode ||
    (typeof import.meta !== "undefined" && (import.meta.env?.VITE_CASHFREE_MODE || import.meta.env?.VITE_CASHFREE_ENV)) ||
    (typeof process !== "undefined" && (process.env?.CASHFREE_ENV || process.env?.CASHFREE_MODE)) ||
    "sandbox";

  const mode = String(rawMode).toLowerCase() === "production" ? "production" : "sandbox";

  if (!appId || !secretKey) {
    throw new Error(
      "Cashfree credentials missing. Set CASHFREE_APP_ID (or VITE_CASHFREE_APP_ID) and CASHFREE_SECRET_KEY in environment variables."
    );
  }

  const baseUrl =
    mode === "production"
      ? "https://api.cashfree.com/pg/orders"
      : "https://sandbox.cashfree.com/pg/orders";

  const cleanPhone = params.customerPhone.replace(/\D/g, "") || "9999999999";
  const customerId = `cust_${cleanPhone.slice(-10)}_${Math.floor(1000 + Math.random() * 9000)}`;
  const returnUrl =
    params.returnUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/?order_id={order_id}`
      : "https://dawaiin.com/?order_id={order_id}");

  const payload = {
    order_amount: Number(params.amount.toFixed(2)),
    order_currency: "INR",
    order_id: params.orderId,
    customer_details: {
      customer_id: customerId,
      customer_name: params.customerName.trim() || "Customer",
      customer_phone: cleanPhone.slice(-10),
      customer_email: params.customerEmail?.trim() || `${cleanPhone.slice(-10)}@dawaiin.com`,
    },
    order_meta: {
      return_url: returnUrl,
    },
  };

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": "2023-08-01",
      "x-client-id": appId,
      "x-client-secret": secretKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.payment_session_id) {
    const errorMsg = data?.message || data?.error || `Cashfree API returned HTTP status ${response.status}`;
    throw new Error(`Failed to create Cashfree order session: ${errorMsg}`);
  }

  return {
    payment_session_id: data.payment_session_id,
    order_id: data.order_id || params.orderId,
    cf_order_id: data.cf_order_id ? String(data.cf_order_id) : undefined,
    order_status: data.order_status,
  };
}
