import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  QrCode,
  Ticket,
  XCircle,
  Camera,
  CameraOff,
} from "lucide-react";

import { Html5Qrcode } from "html5-qrcode";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CheckInResult {
  success: boolean;
  message: string;
  ticket_id: string | null;
  ticket_code: string | null;
  event_id: string | null;
  attendee_id: string | null;
  quantity: number | null;
  ticket_status: string | null;
  checked_in_at: string | null;
}

export default function CheckIn() {
  const { profile, user, isOrganizer, isLoading: authLoading } = useAuth();

  const [ticketCode, setTicketCode] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRunningRef = useRef(false);
  const scanProcessingRef = useRef(false);

  const handleCheckIn = async (codeOverride?: string) => {
    const code = (codeOverride ?? ticketCode).trim();

    if (!code) {
      setResult({
        success: false,
        message: "Enter a ticket code first.",
        ticket_id: null,
        ticket_code: null,
        event_id: null,
        attendee_id: null,
        quantity: null,
        ticket_status: null,
        checked_in_at: null,
      });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.rpc("check_in_ticket", {
        p_ticket_code: code,
      });

      if (error) {
        console.error("Check-in RPC error:", error);

        setResult({
          success: false,
          message: error.message || "Unable to check in this ticket.",
          ticket_id: null,
          ticket_code: code,
          event_id: null,
          attendee_id: null,
          quantity: null,
          ticket_status: null,
          checked_in_at: null,
        });

        return;
      }

      const row = Array.isArray(data) ? data[0] : data;

      if (!row) {
        setResult({
          success: false,
          message: "No response was returned from the check-in service.",
          ticket_id: null,
          ticket_code: code,
          event_id: null,
          attendee_id: null,
          quantity: null,
          ticket_status: null,
          checked_in_at: null,
        });

        return;
      }

      setResult(row as CheckInResult);

      if (row.success) {
        setTicketCode("");
      }
    } catch (error) {
      console.error("Unexpected check-in error:", error);

      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        ticket_id: null,
        ticket_code: code,
        event_id: null,
        attendee_id: null,
        quantity: null,
        ticket_status: null,
        checked_in_at: null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ============================================================
   * STOP QR SCANNER
   * ============================================================
   */
  const stopScanner = async () => {
    const scanner = scannerRef.current;

    scannerRef.current = null;
    scannerRunningRef.current = false;
    scanProcessingRef.current = false;

    if (scanner) {
      try {
        await scanner.stop();
      } catch (error) {
        console.error("Unable to stop QR scanner:", error);
      }

      try {
        scanner.clear();
      } catch (error) {
        console.error("Unable to clear QR scanner:", error);
      }
    }

    setScannerOpen(false);
    setScannerStarting(false);
  };

  /*
   * ============================================================
   * START QR SCANNER
   * ============================================================
   *
   * IMPORTANT:
   * We do NOT create Html5Qrcode here.
   *
   * First we set scannerOpen(true), allowing React to render
   * #eventflow-qr-reader.
   *
   * The useEffect below then creates the scanner after the
   * element actually exists in the DOM.
   */
  const startScanner = () => {
    setScannerError(null);
    setResult(null);
    setScannerStarting(true);
    setScannerOpen(true);
  };

  /*
   * ============================================================
   * INITIALIZE QR SCANNER AFTER DOM RENDER
   * ============================================================
   */
  useEffect(() => {
    if (!scannerOpen) {
      return;
    }

    let cancelled = false;

    const initializeScanner = async () => {
      try {
        /*
         * Give React a moment to commit the scanner container
         * to the DOM before Html5Qrcode tries to find it.
         */
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });

        if (cancelled) {
          return;
        }

        const element = document.getElementById("eventflow-qr-reader");

        if (!element) {
          throw new Error(
            "QR scanner container was not found. Please close the scanner and try again."
          );
        }

        /*
         * Prevent duplicate scanner instances.
         */
        if (scannerRef.current) {
          return;
        }

        const scanner = new Html5Qrcode("eventflow-qr-reader");

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            const code = decodedText.trim();

            if (!code) {
              return;
            }

            /*
             * Prevent the scanner callback from firing multiple
             * times while one ticket is already being processed.
             */
            if (scanProcessingRef.current) {
              return;
            }

            scanProcessingRef.current = true;

            setTicketCode(code);

            await stopScanner();

            await handleCheckIn(code);
          },
          () => {
            /*
             * QR scan failures are normal while the camera
             * is searching for a QR code.
             */
          }
        );

        if (cancelled) {
          try {
            await scanner.stop();
          } catch {
            // Ignore cleanup errors.
          }

          try {
            scanner.clear();
          } catch {
            // Ignore cleanup errors.
          }

          scannerRef.current = null;
          scannerRunningRef.current = false;
          return;
        }

        scannerRunningRef.current = true;
        setScannerStarting(false);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("QR scanner error:", error);

        scannerRef.current = null;
        scannerRunningRef.current = false;
        scanProcessingRef.current = false;

        setScannerOpen(false);
        setScannerStarting(false);

        setScannerError(
          error instanceof Error
            ? error.message
            : "Unable to access the camera. Please allow camera permission and try again."
        );
      }
    };

    initializeScanner();

    return () => {
      cancelled = true;
    };
  }, [scannerOpen]);

  /*
   * ============================================================
   * CLEANUP ON PAGE EXIT
   * ============================================================
   */
  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;

      scannerRef.current = null;
      scannerRunningRef.current = false;
      scanProcessingRef.current = false;

      if (scanner) {
        scanner
          .stop()
          .catch((error) => {
            console.error("Scanner cleanup error:", error);
          })
          .finally(() => {
            try {
              scanner.clear();
            } catch (error) {
              console.error("Scanner clear error:", error);
            }
          });
      }
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleCheckIn();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading check-in...
        </div>
      </div>
    );
  }

  if (!user || !isOrganizer) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
          <XCircle className="size-12 mx-auto text-destructive mb-4" />

          <h1 className="text-xl font-bold">
            Check-in access required
          </h1>

          <p className="text-sm text-muted-foreground mt-2">
            Only signed-in organizers and administrators can check in
            EventFlow tickets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] px-4 py-8 sm:py-12">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <QrCode className="size-7 text-primary" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold">
            Ticket Check-In
          </h1>

          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Scan an attendee's QR code or enter their ticket code manually
            to verify and check them into the event.
          </p>

          <p className="text-xs text-muted-foreground mt-3">
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {profile?.full_name || user.email || "Organizer"}
            </span>
          </p>
        </div>

        {/* QR Scanner */}
        <div className="glass rounded-2xl p-5 sm:p-7 mb-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-semibold">
                Scan QR Code
              </h2>

              <p className="text-xs text-muted-foreground mt-1">
                Use your phone camera to scan the attendee's ticket.
              </p>
            </div>

            {scannerOpen ? (
              <Button
                type="button"
                variant="outline"
                onClick={stopScanner}
                disabled={scannerStarting || submitting}
              >
                <CameraOff className="size-4" />
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                onClick={startScanner}
                disabled={submitting}
              >
                <Camera className="size-4" />
                Scan
              </Button>
            )}
          </div>

          {scannerOpen && (
            <div className="overflow-hidden rounded-xl border bg-black">
              <div
                id="eventflow-qr-reader"
                className="w-full min-h-[300px]"
              />
            </div>
          )}

          {scannerStarting && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Starting camera...
            </div>
          )}

          {scannerError && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <XCircle className="size-5 text-destructive shrink-0" />

                <div>
                  <p className="text-sm font-medium">
                    Camera unavailable
                  </p>

                  <p className="text-xs text-muted-foreground mt-1">
                    {scannerError}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!scannerOpen && !scannerError && (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <QrCode className="size-10 mx-auto text-muted-foreground mb-3" />

              <p className="text-sm text-muted-foreground">
                Tap{" "}
                <span className="font-medium text-foreground">
                  Scan
                </span>{" "}
                to open the camera.
              </p>
            </div>
          )}
        </div>

        {/* Manual Check-In */}
        <div className="glass rounded-2xl p-5 sm:p-7">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="ticket-code"
                className="text-sm font-medium"
              >
                Ticket Code
              </label>

              <div className="relative mt-2">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

                <Input
                  id="ticket-code"
                  value={ticketCode}
                  onChange={(event) =>
                    setTicketCode(event.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  placeholder="Enter ticket code"
                  className="pl-10 h-12 font-mono"
                  autoComplete="off"
                  autoCapitalize="characters"
                  disabled={submitting}
                />
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                You can also enter the code shown below the attendee's QR
                code.
              </p>
            </div>

            <Button
              onClick={() => handleCheckIn()}
              disabled={submitting || !ticketCode.trim()}
              className="w-full h-12"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Checking Ticket...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Check In Ticket
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div
            className={`mt-5 rounded-2xl border p-5 ${
              result.success
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-destructive/30 bg-destructive/10"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="size-6 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="size-6 text-destructive shrink-0" />
              )}

              <div className="min-w-0">
                <h2 className="font-semibold">
                  {result.success
                    ? "Ticket Checked In"
                    : "Check-In Failed"}
                </h2>

                <p className="text-sm text-muted-foreground mt-1">
                  {result.message}
                </p>

                {result.ticket_code && (
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Ticket Code
                      </span>

                      <span className="font-mono font-medium">
                        {result.ticket_code}
                      </span>
                    </div>

                    {result.quantity !== null && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">
                          Quantity
                        </span>

                        <span className="font-medium">
                          {result.quantity}
                        </span>
                      </div>
                    )}

                    {result.ticket_status && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">
                          Status
                        </span>

                        <span className="font-medium capitalize">
                          {result.ticket_status}
                        </span>
                      </div>
                    )}

                    {result.checked_in_at && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">
                          Checked In
                        </span>

                        <span className="font-medium">
                          {new Date(
                            result.checked_in_at
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
