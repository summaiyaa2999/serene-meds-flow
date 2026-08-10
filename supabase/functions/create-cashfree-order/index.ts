// Supabase Edge Function: create-cashfree-order
// Generates payment_session_id via Cashfree REST API (/pg/orders)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Must be a POST request." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();
    const { orderId, amount, customerName, customerPhone, customerEmail, returnUrl } = body;

    if (!orderId || !amount || !customerName || !customerPhone) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: orderId, amount, customerName, customerPhone are required.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const appId =
      Deno.env.get("VITE_CASHFREE_APP_ID") ||
      Deno.env.get("CASHFREE_APP_ID") ||
      Deno.env.get("CASHFREE_CLIENT_ID");

    const secretKey = Deno.env.get("CASHFREE_SECRET_KEY");
    const mode = Deno.env.get("VITE_CASHFREE_MODE") || Deno.env.get("CASHFREE_MODE") || "sandbox";

    if (!appId || !secretKey) {
      console.error("Missing Cashfree environment secrets (VITE_CASHFREE_APP_ID / CASHFREE_SECRET_KEY).");
      return new Response(
        JSON.stringify({
          error: "Server configuration error: Cashfree API credentials missing.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const baseUrl =
      mode === "production"
        ? "https://api.cashfree.com/pg/orders"
        : "https://sandbox.cashfree.com/pg/orders";

    const cleanPhone = String(customerPhone).replace(/\D/g, "") || "9999999999";
    const customerId = `cust_${cleanPhone.slice(-10)}_${Math.floor(1000 + Math.random() * 9000)}`;

    const cashfreePayload = {
      order_amount: Number(Number(amount).toFixed(2)),
      order_currency: "INR",
      order_id: String(orderId),
      customer_details: {
        customer_id: customerId,
        customer_name: String(customerName).trim(),
        customer_phone: cleanPhone.slice(-10),
        customer_email: customerEmail?.trim() || `${cleanPhone.slice(-10)}@dawaiin.com`,
      },
      order_meta: {
        return_url: returnUrl || `https://dawaiin.com/?order_id={order_id}`,
      },
    };

    const cashfreeRes = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secretKey,
      },
      body: JSON.stringify(cashfreePayload),
    });

    const cashfreeData = await cashfreeRes.json();

    if (!cashfreeRes.ok || !cashfreeData.payment_session_id) {
      console.error("Cashfree API error:", cashfreeData);
      return new Response(
        JSON.stringify({
          error: cashfreeData?.message || cashfreeData?.error || "Failed to create Cashfree payment session.",
          details: cashfreeData,
        }),
        {
          status: cashfreeRes.status || 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        payment_session_id: cashfreeData.payment_session_id,
        order_id: cashfreeData.order_id || orderId,
        cf_order_id: cashfreeData.cf_order_id ? String(cashfreeData.cf_order_id) : undefined,
        order_status: cashfreeData.order_status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Error in create-cashfree-order Edge Function:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
