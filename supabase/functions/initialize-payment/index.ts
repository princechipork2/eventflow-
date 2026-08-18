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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    console.log("========================================");
    console.log("INITIALIZE PAYMENT DIAGNOSTIC");
    console.log("========================================");

    console.log("Request method:", req.method);
    console.log(
      "SUPABASE_URL present:",
      Boolean(SUPABASE_URL)
    );
    console.log(
      "SUPABASE_SERVICE_ROLE_KEY present:",
      Boolean(SUPABASE_SERVICE_ROLE_KEY)
    );
    console.log(
      "PAYSTACK_SECRET_KEY present:",
      Boolean(PAYSTACK_SECRET_KEY)
    );

    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured.");
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

    console.log(
      "Authorization header present:",
      Boolean(authHeader)
    );

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Authentication required.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    console.log("Authenticated user:", user?.id ?? null);
    console.log(
      "Authenticated user email present:",
      Boolean(user?.email)
    );
    console.log("Auth error:", userError ?? null);

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid authentication.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body = await req.json();

    console.log(
      "Request body keys:",
      Object.keys(body || {})
    );

    const orderId = body.order_id;

    console.log("Order ID received:", orderId);

    if (!orderId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Order ID is required.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Fetch the order.
     */
    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .select(
          "id, user_id, total_amount, status, payment_status"
        )
        .eq("id", orderId)
        .single();

    console.log("========================================");
    console.log("ORDER QUERY RESULT");
    console.log("========================================");

    console.log("Order returned:", order ?? null);
    console.log("Order query error:", orderError ?? null);

    if (orderError || !order) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            orderError?.message ||
            "Order not found.",
          diagnostic_code:
            orderError?.code || "NO_ORDER",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Make sure the authenticated user owns this order.
     */
    console.log(
      "Order owner:",
      order.user_id
    );

    console.log(
      "Authenticated user:",
      user.id
    );

    if (order.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "You do not own this order.",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Only pending orders may start a new payment.
     */
    if (order.status !== "pending") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "This order is no longer pending.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (order.payment_status === "successful") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "This order has already been paid.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const amount = Number(order.total_amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid order amount.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Generate the Paystack reference on the server.
     */
    const reference = `EVF-${order.id}-${Date.now()}`;

    console.log(
      "Initializing Paystack transaction for order:",
      order.id
    );

    console.log(
      "Paystack amount in NGN:",
      amount
    );

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: Math.round(amount * 100),
          reference,
          currency: "NGN",
          metadata: {
            order_id: order.id,
            user_id: user.id,
          },
        }),
      }
    );

    const result = await paystackResponse.json();

    console.log(
      "Paystack HTTP status:",
      paystackResponse.status
    );

    console.log(
      "Paystack response status:",
      result?.status
    );

    console.log(
      "Paystack response message:",
      result?.message
    );

    if (!paystackResponse.ok || !result.status) {
      console.error(
        "Paystack initialization error:",
        result
      );

      return new Response(
        JSON.stringify({
          success: false,
          message:
            result.message ||
            "Unable to initialize Paystack payment.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url:
          result.data.authorization_url,
        access_code:
          result.data.access_code,
        reference:
          result.data.reference,
        order_id: order.id,
        amount,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "========================================"
    );

    console.error(
      "INITIALIZE PAYMENT ERROR"
    );

    console.error(
      "========================================"
    );

    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to initialize payment.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
