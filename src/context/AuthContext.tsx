import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useNotifications } from "@/context/NotificationContext";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: "organizer" | "attendee";
  avatar_url?: string;
  phone_number?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isOrganizer: boolean;
  isLoading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<boolean>;

  signInWithGoogle: (role?: "organizer" | "attendee") => Promise<boolean>;

  signup: (
    name: string,
    email: string,
    password: string,
    role: "organizer" | "attendee"
  ) => Promise<boolean>;

  resendConfirmationEmail: (
    email: string
  ) => Promise<boolean>;

  logout: () => Promise<void>;

  sendPasswordResetEmail: (
    email: string
  ) => Promise<boolean>;

  updatePassword: (
    newPassword: string
  ) => Promise<boolean>;

  updateProfile: (
    fullName: string,
    phoneNumber: string
  ) => Promise<boolean>;

  refreshProfile: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { success, error: notifyError } = useNotifications();

  const [user, setUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error(
          "Error fetching profile:",
          error.message
        );

        setProfile(null);
        return;
      }

      setProfile(data as Profile | null);
    },
    []
  );

  const refreshProfile = useCallback(
    async (_role?: "organizer" | "attendee") => {
      if (!user) {
        setProfile(null);
        return;
      }

      await fetchProfile(user.id);
    },
    [user, fetchProfile]
  );

  useEffect(() => {
    let mounted = true;

    const initialiseAuth = async (_role?: "organizer" | "attendee") => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error(
            "AUTH SESSION ERROR:",
            error.message
          );

          setUser(null);
          setProfile(null);
          return;
        }

        const currentUser =
          session?.user ?? null;

        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error(
          "AUTH INITIALIZATION ERROR:",
          error
        );

        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialiseAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        const currentUser =
          session?.user ?? null;

        if (
          event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED" ||
          event === "PASSWORD_RECOVERY"
        ) {
          setUser(currentUser);

          if (!currentUser) {
            setProfile(null);
            return;
          }

          setTimeout(() => {
            if (mounted) {
              fetchProfile(currentUser.id);
            }
          }, 0);

          return;
        }

        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = useCallback(
    async (
      email: string,
      password: string
    ) => {
      const cleanEmail =
        email.trim().toLowerCase();

      const { error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        notifyError(error.message);
        return false;
      }

      success("Welcome back!");
      return true;
    },
    [notifyError, success]
  );

  const signInWithGoogle = useCallback(
    async (_role?: "organizer" | "attendee") => {
      const redirectTo =
        `${window.location.origin}/auth`;

      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
          },
        });

      if (error) {
        console.error(
          "GOOGLE SIGN IN ERROR:",
          error.message
        );

        notifyError(error.message);
        return false;
      }

      return true;
    },
    [notifyError]
  );

  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: "organizer" | "attendee"
    ) => {
      const cleanEmail =
        email.trim().toLowerCase();

      const redirectTo =
        `${window.location.origin}/auth`;

      const { error } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: name,
              role,
            },
            emailRedirectTo: redirectTo,
          },
        });

      if (error) {
        notifyError(error.message);
        return false;
      }

      return true;
    },
    [notifyError]
  );

  const resendConfirmationEmail =
    useCallback(async (email: string) => {
      const cleanEmail =
        email.trim().toLowerCase();

      if (!cleanEmail) {
        notifyError(
          "Please enter your email address."
        );

        return false;
      }

      const { error } =
        await supabase.auth.resend({
          type: "signup",
          email: cleanEmail,
          options: {
            emailRedirectTo:
              `${window.location.origin}/auth`,
          },
        });

      if (error) {
        console.error(
          "RESEND CONFIRMATION ERROR:",
          error.message
        );

        if (
          error.message
            .toLowerCase()
            .includes("rate") ||
          error.message
            .toLowerCase()
            .includes("exceeded")
        ) {
          notifyError(
            "Email sending is temporarily rate-limited. Please wait before requesting another email."
          );
        } else {
          notifyError(error.message);
        }

        return false;
      }

      success(
        "Confirmation email sent. Check your inbox."
      );

      return true;
    }, [notifyError, success]);

  const logout = useCallback(async (_role?: "organizer" | "attendee") => {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      notifyError(error.message);
      return;
    }

    setUser(null);
    setProfile(null);
  }, [notifyError]);

  const sendPasswordResetEmail =
    useCallback(async (email: string) => {
      const cleanEmail =
        email.trim().toLowerCase();

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo:
              `${window.location.origin}/auth/reset-password`,
          }
        );

      if (error) {
        notifyError(error.message);
        return false;
      }

      success(
        "Password reset link sent to your email."
      );

      return true;
    }, [notifyError, success]);

  const updateProfile = useCallback(
    async (
      fullName: string,
      phoneNumber: string
    ) => {
      if (!user) {
        notifyError(
          "You must be signed in to update your profile."
        );
        return false;
      }

      const cleanName = fullName.trim();
      const cleanPhone = phoneNumber.trim();

      if (!cleanName) {
        notifyError("Full name is required.");
        return false;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: cleanName,
          phone_number: cleanPhone || null,
        })
        .eq("id", user.id);

      if (error) {
        console.error(
          "Error updating profile:",
          error.message
        );
        notifyError(error.message);
        return false;
      }

      await fetchProfile(user.id);

      success("Profile updated successfully!");
      return true;
    },
    [user, fetchProfile, notifyError, success]
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      const { error } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (error) {
        notifyError(error.message);
        return false;
      }

      success(
        "Password updated successfully!"
      );

      return true;
    },
    [notifyError, success]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated:
          user !== null,
        isOrganizer:
          profile?.role === "organizer",
        isLoading,
        login,
        signInWithGoogle,
        signup,
        resendConfirmationEmail,
        logout,
        sendPasswordResetEmail,
        updatePassword,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    );
  }

  return ctx;
}
