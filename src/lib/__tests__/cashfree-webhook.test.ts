import { describe, it, expect, vi } from "vitest";
import {
  computeHmacSha256,
  verifyCashfreeSignature,
  parseCashfreePayload,
  mapCashfreeStatusToOrderStatus,
  processCashfreeWebhookRequest,
} from "../cashfree-webhook-handler";

describe("Cashfree Webhook Handler", () => {
  const secretKey = "test_cashfree_secret_key_12345";
  const timestamp = "1684407115000";

  const successPayload = {
    type: "PAYMENT_SUCCESS_WEBHOOK",
    event_time: "2026-08-10T11:00:00+05:30",
    data: {
      order: {
        order_id: "ORD-9999",
        order_amount: 1500.0,
        order_currency: "INR",
      },
      payment: {
        cf_payment_id: "109876543",
        payment_status: "SUCCESS",
        payment_amount: 1500.0,
        payment_currency: "INR",
        payment_message: "Transaction Successful",
      },
    },
  };

  const failedPayload = {
    type: "PAYMENT_FAILED_WEBHOOK",
    event_time: "2026-08-10T11:05:00+05:30",
    data: {
      order: {
        order_id: "ORD-8888",
      },
      payment: {
        cf_payment_id: "109876544",
        payment_status: "FAILED",
      },
    },
  };

  it("should correctly calculate HMAC-SHA256 signature in Base64 and Hex", async () => {
    const rawBody = JSON.stringify(successPayload);
    const payloadToSign = `${timestamp}${rawBody}`;

    const computed = await computeHmacSha256(secretKey, payloadToSign);
    expect(computed.base64).toBeTypeOf("string");
    expect(computed.hex).toBeTypeOf("string");
    expect(computed.base64.length).toBeGreaterThan(0);
    expect(computed.hex.length).toBe(64);
  });

  it("should verify valid Cashfree webhook signature", async () => {
    const rawBody = JSON.stringify(successPayload);
    const payloadToSign = `${timestamp}${rawBody}`;
    const computed = await computeHmacSha256(secretKey, payloadToSign);

    const isValidBase64 = await verifyCashfreeSignature(
      rawBody,
      timestamp,
      computed.base64,
      secretKey
    );
    expect(isValidBase64).toBe(true);

    const isValidHex = await verifyCashfreeSignature(
      rawBody,
      timestamp,
      computed.hex,
      secretKey
    );
    expect(isValidHex).toBe(true);
  });

  it("should reject tampered or invalid Cashfree webhook signature", async () => {
    const rawBody = JSON.stringify(successPayload);

    const isValid = await verifyCashfreeSignature(
      rawBody,
      timestamp,
      "invalid_fake_signature_base64",
      secretKey
    );
    expect(isValid).toBe(false);
  });

  it("should parse order_id, payment_status, and cf_payment_id from Cashfree payload", () => {
    const parsedSuccess = parseCashfreePayload(successPayload);
    expect(parsedSuccess.orderId).toBe("ORD-9999");
    expect(parsedSuccess.paymentStatus).toBe("SUCCESS");
    expect(parsedSuccess.cfPaymentId).toBe("109876543");
    expect(parsedSuccess.eventType).toBe("PAYMENT_SUCCESS_WEBHOOK");

    const flatPayload = {
      event: "PAYMENT_SUCCESS_WEBHOOK",
      order_id: "ORD-1111",
      payment_status: "PAID",
      cf_payment_id: "55555",
    };
    const parsedFlat = parseCashfreePayload(flatPayload);
    expect(parsedFlat.orderId).toBe("ORD-1111");
    expect(parsedFlat.paymentStatus).toBe("PAID");
    expect(parsedFlat.cfPaymentId).toBe("55555");
  });

  it("should map Cashfree payment status to Supabase order status", () => {
    expect(mapCashfreeStatusToOrderStatus("PAYMENT_SUCCESS_WEBHOOK", "SUCCESS")).toBe("Paid");
    expect(mapCashfreeStatusToOrderStatus("PAYMENT_FAILED_WEBHOOK", "FAILED")).toBe("Payment Failed");
    expect(mapCashfreeStatusToOrderStatus("UNKNOWN_EVENT", "USER_DROPPED")).toBe("Payment Failed");
    expect(mapCashfreeStatusToOrderStatus("ORDER_PAID", "PAID")).toBe("Paid");
  });

  it("should reject HTTP requests with missing or invalid signatures with 401 Unauthorized", async () => {
    const req = new Request("https://example.com/api/cashfree-webhook", {
      method: "POST",
      headers: {
        "x-webhook-signature": "invalid_sig",
        "x-webhook-timestamp": timestamp,
      },
      body: JSON.stringify(successPayload),
    });

    const res = await processCashfreeWebhookRequest(req, { secretKey });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Invalid webhook signature");
  });

  it("should process valid signed webhook request and call Supabase update", async () => {
    const rawBody = JSON.stringify(successPayload);
    const payloadToSign = `${timestamp}${rawBody}`;
    const computed = await computeHmacSha256(secretKey, payloadToSign);

    const mockEq = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockResolvedValue({
        data: [{ id: "uuid-1", order_number: "ORD-9999", status: "Paid" }],
        error: null,
      }),
    }));

    const mockUpdate = vi.fn().mockImplementation(() => ({
      eq: mockEq,
    }));

    const mockSupabase = {
      from: vi.fn().mockImplementation(() => ({
        update: mockUpdate,
      })),
    };

    const req = new Request("https://example.com/api/cashfree-webhook", {
      method: "POST",
      headers: {
        "x-webhook-signature": computed.base64,
        "x-webhook-timestamp": timestamp,
      },
      body: rawBody,
    });

    const res = await processCashfreeWebhookRequest(req, {
      secretKey,
      supabaseClient: mockSupabase,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order_id).toBe("ORD-9999");
    expect(res.body.status).toBe("Paid");
    expect(res.body.cf_payment_id).toBe("109876543");

    expect(mockSupabase.from).toHaveBeenCalledWith("orders");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Paid",
        cf_payment_id: "109876543",
      })
    );
    expect(mockEq).toHaveBeenCalledWith("order_number", "ORD-9999");
  });
});
