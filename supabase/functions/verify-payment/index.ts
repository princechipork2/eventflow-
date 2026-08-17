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

    const reference = body.reference;
    const orderId = body.order_id;

    if (!reference) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment reference is required.",
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

    if (orderError || !order) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Order not found.",
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
     * Make sure the authenticated user owns the order.
     */
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
     * Ask Paystack for the authoritative payment status.
     */
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = await paystackResponse.json();

    if (!paystackResponse.ok || !result.status) {
      console.error(
        "Paystack verification error:",
        result
      );

      return new Response(
        JSON.stringify({
          success: false,
          message:
            result.message ||
            "Unable to verify payment with Paystack.",
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

    const payment = result.data;

    /*
     * The payment must belong to the same order.
     */
    if (
      payment.metadata?.order_id &&
      payment.metadata.order_id !== order.id
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "Payment does not belong to this order.",
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
     * Compare the amount paid by Paystack with the
     * amount stored in our order.
     *
     * Paystack reports amount in kobo.
     */
    const expectedAmountKobo = Math.round(
      Number(order.total_amount) * 100
    );

    if (Number(payment.amount) !== expectedAmountKobo) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "Payment amount does not match the order amount.",
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

    const successful =
      payment.status === "success";

    return new Response(
      JSON.stringify({
        success: successful,
        payment_status: payment.status,
        reference: payment.reference,
        amount: payment.amount,
        currency: payment.currency,
        paid_at: payment.paid_at,
        email:
          payment.customer?.email ?? null,
        order_id: order.id,
        message: successful
          ? "Payment verified successfully."
          : "Payment has not been completed.",
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
      "VERIFY PAYMENT ERROR:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to verify payment.",
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
