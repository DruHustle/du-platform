import {
  getPasswordIssue,
  PASSWORD_ERROR_MESSAGES,
} from "@shared/passwordPolicy";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getApiErrorMessage } from "@/lib/api";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

function getTokenFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("token") ?? "";
}

export default function ResetPassword() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback });
  const [, setLocation] = useLocation();
  const [token] = useState(getTokenFromUrl);
  const resetRequest = useRef<AbortController | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Keep legacy email links working, then remove the bearer token from history.
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash
    );
    return () => {
      resetRequest.current?.abort();
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const authHeadingClass = "auth-title text-white";
  const authSubtitleClass = "text-sm font-light leading-relaxed text-white/75";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || status) return;
    const passwordIssue = getPasswordIssue(password);
    if (passwordIssue) {
      setError(
        tr(
          `auth.password_rules.${passwordIssue}`,
          PASSWORD_ERROR_MESSAGES[passwordIssue]
        )
      );
      return;
    }
    if (password !== confirmPassword) {
      setError(tr("auth.password_mismatch", "Passwords do not match."));
      return;
    }
    setError("");
    setStatus("");
    setLoading(true);
    const request = new AbortController();
    resetRequest.current = request;
    try {
      const { data } = await api.post(
        "/auth/reset-password",
        {
          token,
          password,
          confirmPassword,
        },
        { signal: request.signal }
      );
      if (request.signal.aborted) return;
      setStatus(
        data.message ?? tr("auth.reset.success", "Password reset successful.")
      );
      redirectTimer.current = setTimeout(() => setLocation("/login"), 900);
    } catch (err: any) {
      if (request.signal.aborted) return;
      setError(
        getApiErrorMessage(
          err,
          tr("auth.reset.error", "Unable to reset password.")
        )
      );
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="min-h-[72vh] bg-slate-950 px-6 pt-20 pb-10 md:pt-24 md:pb-12 flex items-center justify-center">
        <div className="content-panel auth-panel w-full max-w-md mx-auto  p-8 text-white md:p-10">
          <div className="space-y-2 text-center">
            <h1 className={authHeadingClass}>
              {tr("auth.reset.title", "Set New Password")}
            </h1>
            <p className={authSubtitleClass}>
              {tr(
                "auth.reset.subtitle",
                "Choose a strong password for your account."
              )}
            </p>
          </div>

          {!token ? (
            <p className="mt-6 text-sm text-red-400">
              {tr(
                "auth.reset.missing_token",
                "Missing reset token. Please use the link sent to your email."
              )}
            </p>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label
                  htmlFor="ResetPasswordPage-password"
                  className="text-[10px] uppercase tracking-widest font-black text-white/70"
                >
                  {tr("auth.reset.new_password", "New Password")}
                </Label>
                <div className="relative">
                  <Input
                    id="ResetPasswordPage-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="h-12 rounded-xl border-white/20 bg-white/[0.05] pr-11 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={
                      showPassword
                        ? tr("auth.reset.hide_password", "Hide password")
                        : tr("auth.reset.show_password", "Show password")
                    }
                    className="absolute right-1 top-1/2 min-h-11 min-w-11 flex items-center justify-center -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="ResetPasswordPage-confirmPassword"
                  className="text-[10px] uppercase tracking-widest font-black text-white/70"
                >
                  {tr("auth.confirm_password", "Confirm Password")}
                </Label>
                <div className="relative">
                  <Input
                    id="ResetPasswordPage-confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="h-12 rounded-xl border-white/20 bg-white/[0.05] pr-11 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    aria-label={
                      showConfirmPassword
                        ? tr("auth.reset.hide_password", "Hide password")
                        : tr("auth.reset.show_password", "Show password")
                    }
                    className="absolute right-1 top-1/2 min-h-11 min-w-11 flex items-center justify-center -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {status ? (
                <p role="status" className="text-green-400 text-sm">
                  {status}
                </p>
              ) : null}
              {error ? (
                <p role="alert" className="text-red-400 text-sm">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={loading || Boolean(status)}
                className="h-12 w-full rounded-full bg-zim-gold text-[11px] font-black uppercase tracking-widest text-zim-black hover:bg-white"
              >
                {loading
                  ? tr("auth.reset.saving", "Saving...")
                  : tr("auth.reset.reset_password", "Reset Password")}
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-white/10 pt-4 text-center text-sm text-white/75">
            <Link
              href="/login"
              className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-white/70 hover:text-zim-gold"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-2" />
              {tr("auth.reset.back_to_login", "Back to Login")}
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
