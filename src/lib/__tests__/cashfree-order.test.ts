import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCashfreeOrderSession } from "../cashfree";

describe("Cashfree Order Session Helper", () => {
  const mockParams = {
    orderId: "ORD-7777",
    amount: 1250.5,
    customerName: "Jane Doe",
    customerPhone: "9876543210",
    customerEmail: "jane@example.com",
  };

  const options = {
    appId: "TEST_CASHFREE_APP_ID",
    secretKey: "TEST_CASHFREE_SECRET_KEY",
    mode: "sandbox" as const,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should fail gracefully if credentials are missing", async () => {
    await expect(
      createCashfreeOrderSession(mockParams, { appId: "", secretKey: "" })
    ).rejects.toThrow("Cashfree credentials missing");
  });

  it("should request payment_session_id from Cashfree sandbox API endpoint", async () => {
    const mockResponse = {
      payment_session_id: "session_mock_123456789",
      order_id: "ORD-7777",
      cf_order_id: "10987654",
      order_status: "ACTIVE",
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const result = await createCashfreeOrderSession(mockParams, options);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://sandbox.cashfree.com/pg/orders",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-client-id": options.appId,
          "x-client-secret": options.secretKey,
          "x-api-version": "2023-08-01",
        }),
      })
    );

    expect(result.payment_session_id).toBe("session_mock_123456789");
    expect(result.order_id).toBe("ORD-7777");
  });

  it("should throw a detailed error if Cashfree API returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "Invalid order amount" }),
    } as Response);

    await expect(createCashfreeOrderSession(mockParams, options)).rejects.toThrow(
      "Failed to create Cashfree order session: Invalid order amount"
    );
  });
});
