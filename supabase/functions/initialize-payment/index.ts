import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status: number
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    console.log("========================================");
    console.log("INITIALIZE PAYMENT — REQUEST START");
    console.log("========================================");

    if (!PAYSTACK_SECRET_KEY) {
      throw new Error(
        "PAYSTACK_SECRET_KEY is not configured."
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Supabase server credentials are not configured."
      );
    }

    /*
     * Authenticate the caller.
     */
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        {
          success: false,
          message: "Authentication required.",
        },
        401
      );
    }

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const token = authHeader.replace(
      "Bearer ",
      ""
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error(
        "INITIALIZE PAYMENT AUTH ERROR:",
        userError
      );

      return jsonResponse(
        {
          success: false,
          message: "Invalid authentication.",
        },
        401
      );
    }

    console.log(
      "Authenticated user:",
      user.id
    );

    if (!user.email) {
      return jsonResponse(
        {
          success: false,
          message:
            "Your account does not have an email address.",
        },
        400
      );
    }

    const body = await req.json();
    const orderId = body?.order_id;

    if (!orderId) {
      return jsonResponse(
        {
          success: false,
          message: "Order ID is required.",
        },
        400
      );
    }

    /*
     * Fetch the order.
     *
     * expires_at is included so an expired pending order
     * cannot be sent to Paystack.
     */
    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("orders")
      .select(
        "id, user_id, total_amount, status, payment_status, expires_at"
      )
      .eq("id", orderId)
      .single();

    console.log(
      "ORDER QUERY RESULT:",
      JSON.stringify(
        {
          order,
          error: orderError,
        },
        null,
        2
      )
    );

    if (orderError || !order) {
      return jsonResponse(
        {
          success: false,
          message: "Order not found.",
          diagnostic_code:
            orderError?.code || "NO_ORDER",
        },
        404
      );
    }

    /*
     * Make sure the authenticated user owns this order.
     */
    if (order.user_id !== user.id) {
      return jsonResponse(
        {
          success: false,
          message: "You do not own this order.",
        },
        403
      );
    }

    /*
     * Only pending orders may start a payment.
     */
    if (order.status !== "pending") {
      return jsonResponse(
        {
          success: false,
          message:
            "This order is no longer pending.",
        },
        400
      );
    }

    /*
     * Never initialize payment for an expired order.
     */
    if (
      order.expires_at &&
      new Date(order.expires_at) <= new Date()
    ) {
      console.log(
        "ORDER EXPIRED:",
        order.id
      );

      const {
        error: expiryUpdateError,
      } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          payment_status: "failed",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (expiryUpdateError) {
        console.error(
          "FAILED TO CANCEL EXPIRED ORDER:",
          expiryUpdateError
        );
      }

      return jsonResponse(
        {
          success: false,
          message:
            "This order has expired. Please start a new order.",
        },
        400
      );
    }

    /*
     * Do not create another payment for an already-paid order.
     */
    if (order.payment_status === "successful") {
      return jsonResponse(
        {
          success: false,
          message:
            "This order has already been paid.",
        },
        400
      );
    }

    /*
     * The order amount is the server-side source of truth.
     */
    const amount = Number(
      order.total_amount
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return jsonResponse(
        {
          success: false,
          message: "Invalid order amount.",
        },
        400
      );
    }

    /*
     * Generate the Paystack reference on the server.
     */
    const reference =
      `EVF-${order.id}-${Date.now()}`;

    /*
     * Paystack returns the user to this route after payment.
     */
    const callbackUrl =
      `https://eventflow-chipork.vercel.app/payment/callback?order_id=${encodeURIComponent(
        order.id
      )}`;

    console.log(
      "PAYSTACK INITIALIZATION:",
      JSON.stringify(
        {
          order_id: order.id,
          amount_ngn: amount,
          amount_kobo:
            Math.round(amount * 100),
          reference,
          expires_at: order.expires_at,
          callback_url: callbackUrl,
        },
        null,
        2
      )
    );

    const paystackResponse =
      await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            amount:
              Math.round(amount * 100),
            reference,
            currency: "NGN",
            callback_url: callbackUrl,
            metadata: {
              order_id: order.id,
              user_id: user.id,
            },
          }),
        }
      );

    const rawPaystackResponse =
      await paystackResponse.text();

    console.log(
      "PAYSTACK HTTP STATUS:",
      paystackResponse.status
    );

    console.log(
      "PAYSTACK RAW RESPONSE:",
      rawPaystackResponse
    );

    let result: any;

    try {
      result = JSON.parse(
        rawPaystackResponse
      );
    } catch {
      return jsonResponse(
        {
          success: false,
          message:
            "Paystack returned an invalid response.",
        },
        400
      );
    }

    if (
      !paystackResponse.ok ||
      !result?.status
    ) {
      console.error(
        "PAYSTACK INITIALIZATION ERROR:",
        result
      );

      return jsonResponse(
        {
          success: false,
          message:
            result?.message ||
            "Unable to initialize Paystack payment.",
        },
        400
      );
    }

    /*
     * Store the reference against the order.
     *
     * This gives the server a persistent record of which
     * Paystack transaction was initialized for this order.
     */
    const {
      error: referenceUpdateError,
    } = await supabase
      .from("orders")
      .update({
        payment_reference:
          result.data.reference,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (referenceUpdateError) {
      console.error(
        "PAYMENT REFERENCE DATABASE UPDATE ERROR:",
        referenceUpdateError
      );

      /*
       * Do not continue if Paystack initialized successfully
       * but our order record could not store the reference.
       */
      return jsonResponse(
        {
          success: false,
          message:
            "Payment was initialized, but the order could not be updated. Please do not retry immediately.",
        },
        500
      );
    }

    console.log(
      "PAYMENT REFERENCE STORED:",
      result.data.reference
    );

    console.log(
      "========================================"
    );
    console.log(
      "INITIALIZE PAYMENT — REQUEST COMPLETE"
    );
    console.log(
      "========================================"
    );

    return jsonResponse(
      {
        success: true,
        authorization_url:
          result.data.authorization_url,
        access_code:
          result.data.access_code,
        reference:
          result.data.reference,
        order_id: order.id,
        amount,
        expires_at:
          order.expires_at,
      },
      200
    );
  } catch (error) {
    console.error(
      "========================================"
    );
    console.error(
      "INITIALIZE PAYMENT FATAL ERROR"
    );
    console.error(
      "========================================"
    );
    console.error(error);

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to initialize payment.",
      },
      500
    );
  }
});
