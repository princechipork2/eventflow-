import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Ticket,
  ArrowLeft,
  LoaderCircle,
  KeyRound,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useNotifications } from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import { APP_NAME } from "@/constants";

export default function Auth() {
  const { success, error } = useNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    login,
    signup,
    resendConfirmationEmail,
    sendPasswordResetEmail,
    updatePassword,
    isAuthenticated,
  } = useAuth();

  const modeParam = searchParams.get("mode");

  const [mode, setMode] = useState<
    "login" | "signup" | "forgot" | "update_password" | "confirmation"
  >(
    modeParam === "update_password"
      ? "update_password"
      : "login"
  );

  const [confirmationEmail, setConfirmationEmail] = useState("");

  useEffect(() => {
    if (modeParam === "update_password") {
      setMode("update_password");
    }
  }, [modeParam]);

  useEffect(() => {
    if (
      isAuthenticated &&
      mode !== "update_password" &&
      mode !== "confirmation"
    ) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate, mode]);

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState<
    "attendee" | "organizer"
  >("attendee");

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");

  // Update password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);

    const ok = await login(loginEmail, loginPassword);

    setSubmitting(false);

    if (ok) {
      navigate("/dashboard");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !signupName.trim() ||
      !signupEmail.trim() ||
      !signupPassword.trim()
    ) {
      error("Please fill in all fields");
      return;
    }

    if (signupPassword.length < 6) {
      error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);

    const email = signupEmail.trim().toLowerCase();

    const ok = await signup(
      signupName.trim(),
      email,
      signupPassword,
      signupRole
    );

    setSubmitting(false);

    if (ok) {
      setConfirmationEmail(email);
      setMode("confirmation");
      success("Account created. Check your email to confirm.");
    }
  };

  const handleResendConfirmation = async () => {
    if (!confirmationEmail.trim()) {
      error("Please enter your email address.");
      return;
    }

    setResending(true);

    await resendConfirmationEmail(
      confirmationEmail.trim().toLowerCase()
    );

    setResending(false);
  };

  const handleSignupFormResend = async () => {
    if (!signupEmail.trim()) {
      error("Enter your email address first.");
      return;
    }

    setResending(true);

    const email = signupEmail.trim().toLowerCase();

    const ok = await resendConfirmationEmail(email);

    setResending(false);

    if (ok) {
      setConfirmationEmail(email);
      setMode("confirmation");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotEmail.trim()) {
      error("Please enter your email");
      return;
    }

    setSubmitting(true);

    await sendPasswordResetEmail(
      forgotEmail.trim().toLowerCase()
    );

    setSubmitting(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      error("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      error("Passwords don't match");
      return;
    }

    setSubmitting(true);

    const ok = await updatePassword(newPassword);

    setSubmitting(false);

    if (ok) {
      navigate("/dashboard");
    }
  };

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
            {mode === "forgot"
              ? "Reset your password"
              : mode === "update_password"
              ? "Set new password"
              : mode === "confirmation"
              ? "Check your email"
              : `Welcome to ${APP_NAME}`}
          </h1>

          <p className="text-muted-foreground text-sm mt-1">
            {mode === "forgot"
              ? "Enter your email and we'll send you a reset link"
              : mode === "update_password"
              ? "Enter your new password below"
              : mode === "confirmation"
              ? "Confirm your email address to activate your account"
              : "Sign in or create your account"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          {/* Confirmation */}
          {mode === "confirmation" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
                <Mail className="size-8 text-primary" />
              </div>

              <div>
                <h2 className="text-lg font-semibold">
                  Confirmation email sent
                </h2>

                <p className="text-sm text-muted-foreground mt-2">
                  We've sent a confirmation link to:
                </p>

                <p className="font-medium mt-1 break-all">
                  {confirmationEmail}
                </p>
              </div>

              <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                Open your email and click the confirmation link.
                After confirmation, you'll be able to sign in to
                EventFlow.
              </div>

              <Button
                type="button"
                className="w-full gap-2"
                onClick={handleResendConfirmation}
                disabled={resending}
              >
                {resending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Resend Confirmation Email
              </Button>

              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setLoginEmail(confirmationEmail);
                }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mx-auto transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Back to sign in
              </button>
            </div>
          )}

          {/* Forgot Password */}
          {mode === "forgot" && (
            <form
              onSubmit={handleForgotPassword}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="forgot-email">Email</Label>

                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) =>
                      setForgotEmail(e.target.value)
                    }
                    className="pl-9 bg-background border-input"
                    required
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
                  <KeyRound className="size-4" />
                )}
                Send Reset Link
              </Button>

              <button
                type="button"
                onClick={() => setMode("login")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mx-auto transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Back to sign in
              </button>
            </form>
          )}

          {/* Update Password */}
          {mode === "update_password" && (
            <form
              onSubmit={handleUpdatePassword}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="new-password">
                  New Password
                </Label>

                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(e.target.value)
                    }
                    className="pl-9 pr-9 bg-background border-input"
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                <Label htmlFor="confirm-password">
                  Confirm Password
                </Label>

                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    className="pl-9 bg-background border-input"
                    required
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
            </form>
          )}

          {/* Login / Signup */}
          {(mode === "login" || mode === "signup") && (
            <Tabs
              value={mode}
              onValueChange={(v) =>
                setMode(v as "login" | "signup")
              }
              className="w-full"
            >
              <TabsList className="w-full mb-6">
                <TabsTrigger
                  value="login"
                  className="flex-1"
                >
                  Sign In
                </TabsTrigger>

                <TabsTrigger
                  value="signup"
                  className="flex-1"
                >
                  Create Account
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="login-email">
                      Email
                    </Label>

                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) =>
                          setLoginEmail(e.target.value)
                        }
                        className="pl-9 bg-background border-input"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">
                        Password
                      </Label>

                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

                      <Input
                        id="login-password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) =>
                          setLoginPassword(e.target.value)
                        }
                        className="pl-9 pr-9 bg-background border-input"
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(!showPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
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
                      <ArrowRight className="size-4" />
                    )}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form
                  onSubmit={handleSignup}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="signup-name">
                      Full Name
                    </Label>

                    <div className="relative mt-1.5">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

                      <Input
                        id="signup-name"
                        placeholder="Your name"
                        value={signupName}
                        onChange={(e) =>
                          setSignupName(e.target.value)
                        }
                        className="pl-9 bg-background border-input"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-email">
                      Email
                    </Label>

                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signupEmail}
                        onChange={(e) =>
                          setSignupEmail(e.target.value)
                        }
                        className="pl-9 bg-background border-input"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-password">
                      Password
                    </Label>

                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

                      <Input
                        id="signup-password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        placeholder="At least 6 characters"
                        value={signupPassword}
                        onChange={(e) =>
                          setSignupPassword(e.target.value)
                        }
                        className="pl-9 pr-9 bg-background border-input"
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(!showPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                    <Label>I want to</Label>

                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setSignupRole("attendee")
                        }
                        className={`p-3 rounded-xl border text-sm transition-all ${
                          signupRole === "attendee"
                            ? "border-primary bg-primary/10"
                            : "border-border bg-muted hover:border-primary/30"
                        }`}
                      >
                        <User className="size-4 mx-auto mb-1" />
                        Attend Events
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSignupRole("organizer")
                        }
                        className={`p-3 rounded-xl border text-sm transition-all ${
                          signupRole === "organizer"
                            ? "border-primary bg-primary/10"
                            : "border-border bg-muted hover:border-primary/30"
                        }`}
                      >
                        <Sparkles className="size-4 mx-auto mb-1" />
                        Create Events
                      </button>
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
                      <ArrowRight className="size-4" />
                    )}
                    Create Account
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleSignupFormResend}
                    disabled={resending}
                  >
                    {resending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Resend Confirmation Email
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Already created an account but haven't
                    confirmed your email? Enter that email above
                    and use the resend button.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </motion.div>
      </div>
    </div>
  );
}
