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

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return JSON.stringify(
      {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      null,
      2
    );
  }

  return JSON.stringify(
    error,
    Object.getOwnPropertyNames(
      Object(error)
    ),
    2
  );
}

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
    console.log("VERIFY PAYMENT — REQUEST START");
    console.log("========================================");

    if (!PAYSTACK_SECRET_KEY) {
      console.error(
        "VERIFY PAYMENT CONFIG ERROR: PAYSTACK_SECRET_KEY is missing."
      );

      throw new Error(
        "PAYSTACK_SECRET_KEY is not configured."
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error(
        "VERIFY PAYMENT CONFIG ERROR: Supabase server credentials are missing."
      );

      throw new Error(
        "Supabase server credentials are not configured."
      );
    }

    const authHeader = req.headers.get("Authorization");

    console.log(
      "Authorization header present:",
      Boolean(authHeader)
    );

    if (!authHeader) {
      console.error(
        "VERIFY PAYMENT 401: Authorization header is missing."
      );

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
        "VERIFY PAYMENT AUTH ERROR:",
        stringifyError(userError)
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

    const body = await req.json();

    console.log(
      "VERIFY PAYMENT REQUEST BODY:",
      JSON.stringify(body, null, 2)
    );

    const reference = body.reference;
    const orderId = body.order_id;

    console.log(
      "Payment reference:",
      reference
    );

    console.log(
      "Order ID:",
      orderId
    );

    if (!reference) {
      console.error(
        "VERIFY PAYMENT 400: Payment reference is missing."
      );

      return jsonResponse(
        {
          success: false,
          message: "Payment reference is required.",
        },
        400
      );
    }

    if (!orderId) {
      console.error(
        "VERIFY PAYMENT 400: Order ID is missing."
      );

      return jsonResponse(
        {
          success: false,
          message: "Order ID is required.",
        },
        400
      );
    }

    /*
     * Fetch the order using the service-role client.
     */
    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("orders")
      .select(
        "id, user_id, total_amount, status, payment_status, payment_reference, payment_verified_at"
      )
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error(
        "VERIFY PAYMENT ORDER LOOKUP ERROR:",
        stringifyError(orderError)
      );

      console.error(
        "Order lookup result:",
        JSON.stringify(
          {
            orderId,
            order,
          },
          null,
          2
        )
      );

      return jsonResponse(
        {
          success: false,
          message: "Order not found.",
        },
        404
      );
    }

    console.log(
      "ORDER FOUND:",
      JSON.stringify(
        {
          id: order.id,
          user_id: order.user_id,
          total_amount: order.total_amount,
          status: order.status,
          payment_status: order.payment_status,
          payment_reference: order.payment_reference,
          payment_verified_at:
            order.payment_verified_at,
        },
        null,
        2
      )
    );

    /*
     * Make sure the authenticated user owns the order.
     */
    if (order.user_id !== user.id) {
      console.error(
        "VERIFY PAYMENT 403: User does not own order."
      );

      console.error(
        JSON.stringify(
          {
            authenticated_user_id: user.id,
            order_user_id: order.user_id,
            order_id: order.id,
          },
          null,
          2
        )
      );

      return jsonResponse(
        {
          success: false,
          message: "You do not own this order.",
        },
        403
      );
    }

    /*
     * If this order was already server-verified, return the
     * verified Paystack status without creating another payment.
     */
    if (
      order.payment_status === "successful" &&
      order.payment_verified_at &&
      order.payment_reference === reference
    ) {
      console.log(
        "PAYMENT ALREADY VERIFIED:"
      );

      console.log(
        JSON.stringify(
          {
            order_id: order.id,
            reference: order.payment_reference,
          },
          null,
          2
        )
      );

      return jsonResponse(
        {
          success: true,
          payment_status: "success",
          reference: order.payment_reference,
          order_id: order.id,
          message:
            "Payment already verified successfully.",
        },
        200
      );
    }

    /*
     * Ask Paystack for the authoritative payment status.
     */
    const paystackUrl =
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`;

    console.log(
      "PAYSTACK VERIFY REQUEST:"
    );

    console.log(
      JSON.stringify(
        {
          reference,
          order_id: order.id,
          expected_amount_naira:
            Number(order.total_amount),
          expected_amount_kobo:
            Math.round(
              Number(order.total_amount) * 100
            ),
        },
        null,
        2
      )
    );

    const paystackResponse = await fetch(
      paystackUrl,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type":
            "application/json",
        },
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
    } catch (parseError) {
      console.error(
        "PAYSTACK JSON PARSE ERROR:",
        stringifyError(parseError)
      );

      return jsonResponse(
        {
          success: false,
          message:
            "Paystack returned an invalid response.",
        },
        400
      );
    }

    console.log(
      "PAYSTACK PARSED RESPONSE:",
      JSON.stringify(
        result,
        null,
        2
      )
    );

    if (
      !paystackResponse.ok ||
      !result.status
    ) {
      console.error(
        "PAYSTACK VERIFICATION FAILED:"
      );

      console.error(
        JSON.stringify(
          {
            http_status:
              paystackResponse.status,
            paystack_status:
              result?.status,
            paystack_message:
              result?.message,
            paystack_data:
              result?.data,
            reference,
          },
          null,
          2
        )
      );

      return jsonResponse(
        {
          success: false,
          message:
            result.message ||
            "Unable to verify payment with Paystack.",
        },
        400
      );
    }

    const payment = result.data;

    console.log(
      "PAYSTACK PAYMENT DATA:",
      JSON.stringify(
        payment,
        null,
        2
      )
    );

    /*
     * The payment must belong to the same order.
     */
    if (
      payment.metadata?.order_id &&
      payment.metadata.order_id !== order.id
    ) {
      console.error(
        "VERIFY PAYMENT 400: ORDER ID MISMATCH."
      );

      console.error(
        JSON.stringify(
          {
            expected_order_id:
              order.id,
            paystack_order_id:
              payment.metadata.order_id,
            reference,
          },
          null,
          2
        )
      );

      return jsonResponse(
        {
          success: false,
          message:
            "Payment does not belong to this order.",
        },
        400
      );
    }

    /*
     * The payment must belong to the same authenticated user.
     */
    if (
      payment.metadata?.user_id &&
      payment.metadata.user_id !== user.id
    ) {
      console.error(
        "VERIFY PAYMENT 400: USER ID MISMATCH."
      );

      console.error(
        JSON.stringify(
          {
            expected_user_id:
              user.id,
            paystack_user_id:
              payment.metadata.user_id,
            reference,
          },
          null,
          2
        )
      );

      return jsonResponse(
        {
          success: false,
          message:
            "Payment does not belong to this user.",
        },
        400
      );
    }

    /*
     * Compare Paystack amount with the order amount.
     * Paystack reports amount in kobo.
     */
    const expectedAmountKobo =
      Math.round(
        Number(order.total_amount) * 100
      );

    const actualAmountKobo =
      Number(payment.amount);

    console.log(
      "PAYMENT AMOUNT COMPARISON:",
      JSON.stringify(
        {
          order_total_amount:
            order.total_amount,
          expected_amount_kobo:
            expectedAmountKobo,
          paystack_amount_kobo:
            actualAmountKobo,
          match:
            actualAmountKobo ===
            expectedAmountKobo,
        },
        null,
        2
      )
    );

    if (
      actualAmountKobo !==
      expectedAmountKobo
    ) {
      console.error(
        "VERIFY PAYMENT 400: PAYMENT AMOUNT MISMATCH."
      );

      return jsonResponse(
        {
          success: false,
          message:
            "Payment amount does not match the order amount.",
        },
        400
      );
    }

    const successful =
      payment.status === "success";

    console.log(
      "PAYSTACK TRANSACTION STATUS:",
      payment.status
    );

    /*
     * IMPORTANT:
     * Only a successful Paystack transaction is allowed to
     * create the server-side verification record.
     */
    if (successful) {
      const {
        error: verificationUpdateError,
      } = await supabase
        .from("orders")
        .update({
          payment_reference:
            payment.reference,
          payment_status:
            "successful",
          payment_verified_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("user_id", user.id);

      if (verificationUpdateError) {
        console.error(
          "PAYMENT VERIFICATION DATABASE UPDATE ERROR:",
          stringifyError(
            verificationUpdateError
          )
        );

        throw new Error(
          "Payment was verified, but the order could not be updated."
        );
      }

      console.log(
        "PAYMENT VERIFICATION DATABASE UPDATE SUCCESS."
      );
    }

    console.log(
      "========================================"
    );

    console.log(
      "VERIFY PAYMENT — REQUEST COMPLETE"
    );

    console.log(
      "========================================"
    );

    return jsonResponse(
      {
        success: successful,
        payment_status:
          payment.status,
        reference:
          payment.reference,
        amount:
          payment.amount,
        currency:
          payment.currency,
        paid_at:
          payment.paid_at,
        email:
          payment.customer?.email ??
          null,
        order_id:
          order.id,
        message: successful
          ? "Payment verified successfully."
          : "Payment has not been completed.",
      },
      200
    );
  } catch (error) {
    console.error(
      "========================================"
    );

    console.error(
      "VERIFY PAYMENT FATAL ERROR"
    );

    console.error(
      stringifyError(error)
    );

    console.error(
      "========================================"
    );

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to verify payment.",
      },
      500
    );
  }
});
