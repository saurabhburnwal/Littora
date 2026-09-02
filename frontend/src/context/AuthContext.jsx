import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase.js";

export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session) {
        sessionStorage.setItem("littora_session_active", "true");
      } else {
        sessionStorage.removeItem("littora_session_active");
      }
      setLoading(false);
    }).catch(() => {
      setUser(null);
      setLoading(false);
    });

    // Keep in sync with tab-level auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          sessionStorage.setItem("littora_session_active", "true");
        }
        if (event === "SIGNED_OUT") {
          sessionStorage.removeItem("littora_session_active");
        }
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Register a new user with email + password.
   */
  const signUp = useCallback(async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName?.trim() || "" },
      },
    });
    if (error) throw error;
    if (data.user && data.user.identities?.length === 0) {
      throw new Error("This email is already registered. Please sign in instead.");
    }
    return data;
  }, []);

  /**
   * Sign in with email + password.
   */
  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    sessionStorage.setItem("littora_session_active", "true");
    return data;
  }, []);

  /**
   * Sign out and clear local session.
   */
  const logout = useCallback(async () => {
    sessionStorage.removeItem("littora_session_active");
    await supabase.auth.signOut();
  }, []);

  /**
   * Returns the current access token (JWT) for attaching to API requests.
   */
  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  /**
   * Sends a Supabase password-reset email.
   * Supabase appends a recovery token to redirectTo; SetPasswordPage
   * (at /set-password) handles type=recovery to let the user pick a new password.
   */
  const resetPassword = useCallback(async (email) => {
    const redirectTo = `${window.location.origin}/set-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    if (error) throw error;
  }, []);

  const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || "admin@littora.app").toLowerCase();
  const isAdmin = Boolean(user?.email && user.email.toLowerCase() === adminEmail);

  const value = useMemo(
    () => ({ user, loading, login, signUp, logout, isAdmin, getToken, resetPassword }),
    [user, loading, login, signUp, logout, isAdmin, getToken, resetPassword]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
