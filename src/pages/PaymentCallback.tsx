import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;

    if (typeof value.message === "string" && value.message) {
      return value.message;
    }

    if (typeof value.error_description === "string" && value.error_description) {
      return value.error_description;
    }

    if (typeof value.error === "string" && value.error) {
      return value.error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }

  if (typeof error === "string" && error) {
    return error;
  }

  return fallback;
}

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
        console.log("PAYMENT CALLBACK START:", {
          reference,
          orderId,
        });

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

        console.log("VERIFY PAYMENT RESULT:", {
          data: verifyData,
          error: verifyError,
        });

        if (verifyError) {
          throw new Error(
            `Payment verification request failed: ${getErrorMessage(
              verifyError,
              "Unknown verification error."
            )}`
          );
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

        console.log(
          "PAYMENT VERIFICATION SUCCESSFUL"
        );

        setMessage(
          "Payment verified. Confirming your ticket..."
        );

        console.log(
          "STEP 2: LOOKING UP ORDER ITEM"
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

        console.log("ORDER ITEM RESULT:", {
          orderItem,
          error: orderItemError,
        });

        if (orderItemError) {
          throw new Error(
            `Order item lookup failed: ${getErrorMessage(
              orderItemError,
              "Unknown order item error."
            )}`
          );
        }

        if (!orderItem?.ticket_tier_id) {
          throw new Error(
            "Unable to determine the ticket type for this order."
          );
        }

        console.log(
          "STEP 3: FINALIZING TICKET PURCHASE"
        );

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

        console.log("FINALIZE RESULT:", {
          finalized,
          error: finalizeError,
        });

        if (finalizeError) {
          throw new Error(
            `Ticket finalization failed: ${getErrorMessage(
              finalizeError,
              "Unknown ticket finalization error."
            )}`
          );
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

        const errorMessage = getErrorMessage(
          error,
          "Unable to complete payment verification."
        );

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
