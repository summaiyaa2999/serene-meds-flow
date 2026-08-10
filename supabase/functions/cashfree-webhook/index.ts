// Supabase Edge Function: cashfree-webhook
// Follows Deno runtime standards for Supabase Edge Functions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp",
};

/**
 * Compute HMAC-SHA256 signature in Base64 and Hex format using Web Crypto API.
 */
async function computeHmacSha256(
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

  let binaryString = "";
  for (let i = 0; i < byteArray.length; i++) {
    binaryString += String.fromCharCode(byteArray[i]);
  }
  const base64 = btoa(binaryString);

  const hex = Array.from(byteArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { base64, hex };
}

/**
 * Verify Cashfree Webhook Signature.
 */
async function verifyCashfreeSignature(
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
 * Extract order_id, payment_status, cf_payment_id, payment_id from Cashfree event payload.
 */
function parseCashfreePayload(body: any) {
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

  return {
    eventType,
    orderId,
    paymentStatus,
    cfPaymentId: cfPaymentIdRaw ? String(cfPaymentIdRaw) : undefined,
    paymentId: paymentIdRaw ? String(paymentIdRaw) : undefined,
  };
}

/**
 * Map payload status to Supabase order status.
 */
function mapStatus(eventType?: string, paymentStatus?: string): "Paid" | "Payment Failed" {
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

  if (normEvent.includes("SUCCESS") || normStatus.includes("SUCCESS")) {
    return "Paid";
  }

  return "Payment Failed";
}

// Serve Deno Request handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Webhook requires POST request." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const rawBody = await req.text();

    const signatureHeader =
      req.headers.get("x-webhook-signature") ||
      req.headers.get("x-cashfree-signature") ||
      req.headers.get("x-signature");

    const timestampHeader =
      req.headers.get("x-webhook-timestamp") ||
      req.headers.get("x-cashfree-timestamp") ||
      req.headers.get("x-timestamp");

    const secretKey = Deno.env.get("CASHFREE_SECRET_KEY");

    if (!secretKey) {
      console.error("CASHFREE_SECRET_KEY environment variable is not configured.");
      return new Response(
        JSON.stringify({ error: "Server configuration error: CASHFREE_SECRET_KEY missing." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Verify Webhook Signature
    const isValidSignature = await verifyCashfreeSignature(
      rawBody,
      timestampHeader,
      signatureHeader,
      secretKey
    );

    if (!isValidSignature) {
      console.warn("Cashfree Webhook Signature verification failed.");
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Parse Event Payload
    const parsedJson = JSON.parse(rawBody);
    const { eventType, orderId, paymentStatus, cfPaymentId, paymentId } =
      parseCashfreePayload(parsedJson);

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing order_id in Cashfree event payload." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Map status
    const newStatus = mapStatus(eventType, paymentStatus);

    // 4. Update Supabase order
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const updateData: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (cfPaymentId) updateData.cf_payment_id = cfPaymentId;
    if (paymentId) updateData.payment_id = paymentId;

    // First attempt update by order_number
    let { data: updatedOrders, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("order_number", orderId)
      .select();

    // Fallback: update by id if orderId is UUID
    if (
      !updateError &&
      (!updatedOrders || updatedOrders.length === 0) &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(orderId)
    ) {
      const res = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select();
      updatedOrders = res.data;
      updateError = res.error;
    }

    if (updateError) {
      console.error("Database update error:", updateError);
      return new Response(
        JSON.stringify({ error: `Failed to update order: ${updateError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        status: newStatus,
        payment_id: paymentId,
        cf_payment_id: cfPaymentId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Unhandled error processing Cashfree webhook:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
