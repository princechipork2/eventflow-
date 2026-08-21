import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  LoaderCircle,
  ArrowLeft,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { APP_NAME } from "@/constants";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkRecoverySession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !session) {
        setHasRecoverySession(false);
        setCheckingSession(false);

        toast.error(
          "This password reset link is invalid or has expired."
        );

        return;
      }

      setHasRecoverySession(true);
      setCheckingSession(false);
    };

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (
        event === "PASSWORD_RECOVERY" &&
        session
      ) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }

    setSubmitting(true);

    const ok = await updatePassword(newPassword);

    setSubmitting(false);

    if (ok) {
      setNewPassword("");
      setConfirmPassword("");
      navigate("/dashboard", { replace: true });
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <LoaderCircle className="size-7 animate-spin" />
          <p className="text-sm">
            Verifying password reset link...
          </p>
        </div>
      </div>
    );
  }

  if (!hasRecoverySession) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="w-full max-w-md mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 text-center"
          >
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10 mb-5">
              <Lock className="size-8 text-destructive" />
            </div>

            <h1 className="text-2xl font-bold">
              Reset Link Expired
            </h1>

            <p className="text-sm text-muted-foreground mt-2">
              This password reset link is invalid or has
              expired. Please request a new reset link.
            </p>

            <Button
              type="button"
              className="w-full mt-6 gap-2"
              onClick={() => navigate("/auth")}
            >
              <ArrowLeft className="size-4" />
              Back to Sign In
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20">
              <Ticket className="size-5 text-primary" />
            </div>
          </div>

          <h1 className="text-2xl font-bold">
            Set New Password
          </h1>

          <p className="text-muted-foreground text-sm mt-1">
            Choose a new password for your {APP_NAME} account.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <form
            onSubmit={handleUpdatePassword}
            className="space-y-5"
          >
            <div>
              <Label htmlFor="reset-new-password">
                New Password
              </Label>

              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

                <Input
                  id="reset-new-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(e.target.value)
                  }
                  className="pl-9 pr-9 bg-background border-input"
                  required
                  minLength={6}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="reset-confirm-password">
                Confirm New Password
              </Label>

              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

                <Input
                  id="reset-confirm-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  className="pl-9 bg-background border-input"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Update Password
            </Button>

            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mx-auto transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Back to sign in
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
