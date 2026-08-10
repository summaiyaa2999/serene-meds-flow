import { createClient } from "@supabase/supabase-js";

export interface CashfreeWebhookResult {
  status: number;
  body: {
    success?: boolean;
    error?: string;
    order_id?: string;
    status?: string;
    payment_id?: string;
    cf_payment_id?: string;
  };
}

export interface ParsedCashfreePayload {
  eventType?: string;
  orderId?: string;
  paymentStatus?: string;
  cfPaymentId?: string;
  paymentId?: string;
}

/**
 * Compute HMAC-SHA256 signature formatted as Base64 and Hex.
 */
export async function computeHmacSha256(
  secretKey: string,
  payloadToSign: string
): Promise<{ base64: string; hex: string }> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(payloadToSign);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const byteArray = new Uint8Array(signatureBuffer);

  // Base64 encoding
  let binaryString = "";
  for (let i = 0; i < byteArray.length; i++) {
    binaryString += String.fromCharCode(byteArray[i]);
  }
  const base64 = typeof btoa === "function" ? btoa(binaryString) : Buffer.from(signatureBuffer).toString("base64");

  // Hex encoding
  const hex = Array.from(byteArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { base64, hex };
}

/**
 * Verify Cashfree webhook signature against CASHFREE_SECRET_KEY.
 * Cashfree calculates signature using HMAC-SHA256 of (timestamp + rawBody) or rawBody in Base64 or Hex.
 */
export async function verifyCashfreeSignature(
  rawBody: string,
  timestampHeader: string | null,
  signatureHeader: string | null,
  secretKey: string
): Promise<boolean> {
  if (!signatureHeader || !secretKey) {
    return false;
  }

  const cleanSignature = signatureHeader.trim();
  const candidatesToSign: string[] = [];

  if (timestampHeader && timestampHeader.trim()) {
    candidatesToSign.push(`${timestampHeader.trim()}${rawBody}`);
  }
  candidatesToSign.push(rawBody);

  for (const candidate of candidatesToSign) {
    const computed = await computeHmacSha256(secretKey, candidate);
    if (
      computed.base64 === cleanSignature ||
      computed.hex === cleanSignature ||
      computed.base64.toLowerCase() === cleanSignature.toLowerCase() ||
      computed.hex.toLowerCase() === cleanSignature.toLowerCase()
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Extract fields from Cashfree POST event payloads.
 * Supports standard Cashfree PG payload (v2022-09-01 / v2023-08-01) as well as flat payloads.
 */
export function parseCashfreePayload(body: any): ParsedCashfreePayload {
  if (!body || typeof body !== "object") {
    return {};
  }

  const eventType = body.type || body.event || body.event_type || body.data?.type;
  const orderId =
    body.data?.order?.order_id ||
    body.data?.order_id ||
    body.order_id ||
    body.orderId ||
    body.data?.order?.orderId;

  const paymentStatus =
    body.data?.payment?.payment_status ||
    body.data?.payment_status ||
    body.payment_status ||
    body.paymentStatus ||
    body.status;

  const cfPaymentIdRaw =
    body.data?.payment?.cf_payment_id ??
    body.data?.cf_payment_id ??
    body.cf_payment_id ??
    body.cfPaymentId ??
    "";

  const paymentIdRaw =
    body.data?.payment?.payment_id ??
    body.data?.payment_id ??
    body.payment_id ??
    body.paymentId ??
    cfPaymentIdRaw;

  const cfPaymentId = cfPaymentIdRaw ? String(cfPaymentIdRaw) : undefined;
  const paymentId = paymentIdRaw ? String(paymentIdRaw) : undefined;

  return {
    eventType,
    orderId,
    paymentStatus,
    cfPaymentId,
    paymentId,
  };
}

/**
 * Map Cashfree payload event/status to Supabase order status string.
 */
export function mapCashfreeStatusToOrderStatus(
  eventType?: string,
  paymentStatus?: string
): "Paid" | "Payment Failed" {
  const normEvent = eventType?.toUpperCase() || "";
  const normStatus = paymentStatus?.toUpperCase() || "";

  if (
    normEvent === "PAYMENT_SUCCESS_WEBHOOK" ||
    normEvent === "ORDER_PAID" ||
    normStatus === "SUCCESS" ||
    normStatus === "PAID"
  ) {
    return "Paid";
  }

  if (
    normEvent === "PAYMENT_FAILED_WEBHOOK" ||
    normStatus === "FAILED" ||
    normStatus === "USER_DROPPED" ||
    normStatus === "CANCELLED" ||
    normStatus === "ERROR"
  ) {
    return "Payment Failed";
  }

  // Default fallback check
  if (normEvent.includes("SUCCESS") || normStatus.includes("SUCCESS")) {
    return "Paid";
  }

  return "Payment Failed";
}

/**
 * Handle incoming Cashfree webhook HTTP Request.
 */
export async function processCashfreeWebhookRequest(
  request: Request,
  options?: {
    secretKey?: string;
    supabaseClient?: any;
    supabaseUrl?: string;
    supabaseKey?: string;
  }
): Promise<CashfreeWebhookResult> {
  if (request.method !== "POST") {
    return {
      status: 450,
      body: { error: "Method not allowed. Webhook must be a POST request." },
    };
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err) {
    return {
      status: 400,
      body: { error: "Failed to read request body." },
    };
  }

  // Extract signature headers
  const getHeader = (name: string): string | null => {
    return request.headers.get(name) || request.headers.get(name.toLowerCase());
  };

  const signatureHeader =
    getHeader("x-webhook-signature") ||
    getHeader("x-cashfree-signature") ||
    getHeader("x-signature");

  const timestampHeader =
    getHeader("x-webhook-timestamp") ||
    getHeader("x-cashfree-timestamp") ||
    getHeader("x-timestamp");

  // Determine secret key from environment or options
  let secretKey = options?.secretKey;
  if (!secretKey) {
    if (typeof process !== "undefined" && process.env?.CASHFREE_SECRET_KEY) {
      secretKey = process.env.CASHFREE_SECRET_KEY;
    } else if (
      typeof (globalThis as any).Deno !== "undefined" &&
      (globalThis as any).Deno.env?.get
    ) {
      secretKey = (globalThis as any).Deno.env.get("CASHFREE_SECRET_KEY");
    }
  }

  if (!secretKey) {
    console.error("CASHFREE_SECRET_KEY is missing in environment variables.");
    return {
      status: 500,
      body: { error: "Server configuration error: CASHFREE_SECRET_KEY is missing." },
    };
  }

  // Verify Signature
  const isValidSignature = await verifyCashfreeSignature(
    rawBody,
    timestampHeader,
    signatureHeader,
    secretKey
  );

  if (!isValidSignature) {
    console.warn("Cashfree Webhook: Invalid signature rejection.");
    return {
      status: 401,
      body: { error: "Invalid webhook signature." },
    };
  }

  // Parse JSON Body
  let parsedJson: any;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return {
      status: 400,
      body: { error: "Invalid JSON body format." },
    };
  }

  const { eventType, orderId, paymentStatus, cfPaymentId, paymentId } =
    parseCashfreePayload(parsedJson);

  if (!orderId) {
    return {
      status: 400,
      body: { error: "Missing order_id in Cashfree webhook payload." },
    };
  }

  const newStatus = mapCashfreeStatusToOrderStatus(eventType, paymentStatus);

  // Initialize Supabase Client
  let supabase = options?.supabaseClient;
  if (!supabase) {
    const supabaseUrl =
      options?.supabaseUrl ||
      (typeof process !== "undefined" ? process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL : null) ||
      ((globalThis as any).Deno?.env?.get ? (globalThis as any).Deno.env.get("SUPABASE_URL") : null);

    const supabaseKey =
      options?.supabaseKey ||
      (typeof process !== "undefined"
        ? process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_PUBLISHABLE_KEY
        : null) ||
      ((globalThis as any).Deno?.env?.get
        ? (globalThis as any).Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
          (globalThis as any).Deno.env.get("SUPABASE_ANON_KEY")
        : null);

    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  if (!supabase) {
    console.error("Supabase client configuration is missing.");
    return {
      status: 500,
      body: { error: "Server configuration error: Supabase client is uninitialized." },
    };
  }

  // Update order in Supabase orders table
  const updatePayload: Record<string, any> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (cfPaymentId) updatePayload.cf_payment_id = cfPaymentId;
  if (paymentId) updatePayload.payment_id = paymentId;

  // 1. Attempt update by order_number
  let { data: updatedOrders, error: updateError } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("order_number", orderId)
    .select();

  // 2. If no rows matched by order_number and orderId is valid UUID format, attempt update by id
  if (
    !updateError &&
    (!updatedOrders || updatedOrders.length === 0) &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(orderId)
  ) {
    const uuidRes = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId)
      .select();
    updatedOrders = uuidRes.data;
    updateError = uuidRes.error;
  }

  if (updateError) {
    console.error("Supabase update error:", updateError);
    return {
      status: 500,
      body: { error: `Failed to update order status in Supabase: ${updateError.message}` },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      order_id: orderId,
      status: newStatus,
      payment_id: paymentId,
      cf_payment_id: cfPaymentId,
    },
  };
}
