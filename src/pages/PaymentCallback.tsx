import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [message, setMessage] = useState(
    "Confirming your payment..."
  );

  useEffect(() => {
    let cancelled = false;

    const processPayment = async () => {
      const reference = searchParams.get("reference");
      const orderId = searchParams.get("order_id");

      if (!reference || !orderId) {
        setMessage(
          "Payment return information is incomplete."
        );
        return;
      }

      try {
        setMessage("Verifying payment with Paystack...");

        const {
          data: verifyData,
          error: verifyError,
        } = await supabase.functions.invoke(
          "verify-payment",
          {
            body: {
              reference,
              order_id: orderId,
            },
          }
        );

        if (verifyError) {
          throw verifyError;
        }

        if (
          !verifyData?.success ||
          verifyData?.payment_status !== "success"
        ) {
          throw new Error(
            verifyData?.message ||
              "Payment was not completed."
          );
        }

        setMessage(
          "Payment verified. Confirming your ticket..."
        );

        const {
          data: orderItem,
          error: orderItemError,
        } = await supabase
          .from("order_items")
          .select("ticket_tier_id")
          .eq("order_id", orderId)
          .limit(1)
          .maybeSingle();

        if (orderItemError) {
          throw orderItemError;
        }

        if (!orderItem?.ticket_tier_id) {
          throw new Error(
            "Unable to determine the ticket type for this order."
          );
        }

        const {
          data: finalized,
          error: finalizeError,
        } = await supabase.rpc(
          "finalize_ticket_purchase",
          {
            p_order_id: orderId,
            p_ticket_tier_id:
              orderItem.ticket_tier_id,
            p_payment_reference: reference,
          }
        );

        if (finalizeError) {
          throw finalizeError;
        }

        if (!finalized?.success) {
          throw new Error(
            finalized?.message ||
              "Payment succeeded but ticket finalization failed."
          );
        }

        if (cancelled) {
          return;
        }

        toast.success(
          "Payment successful! Your ticket has been confirmed."
        );

        setMessage(
          "Payment successful. Your ticket has been confirmed."
        );

        setTimeout(() => {
          if (!cancelled) {
            navigate("/dashboard", {
              replace: true,
            });
          }
        }, 1200);
      } catch (error) {
        console.error(
          "PAYMENT CALLBACK ERROR:",
          error
        );

        if (cancelled) {
          return;
        }

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unable to complete payment verification.";

        setMessage(errorMessage);

        toast.error(errorMessage);
      }
    };

    processPayment();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">
          Payment Processing
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  );
}
