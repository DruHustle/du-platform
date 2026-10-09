import { useState } from "react";
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
  const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const [, setLocation] = useLocation();
  const [token] = useState(getTokenFromUrl());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const authHeadingClass = "!text-lg font-black tracking-tight text-white md:!text-[1.2rem]";
  const authSubtitleClass = "text-sm font-light leading-relaxed text-white/75";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        token,
        password,
        confirmPassword,
      });
      setStatus(data.message ?? tr("auth.reset.success", "Password reset successful."));
      setTimeout(() => setLocation("/login"), 900);
    } catch (err: any) {
      setError(getApiErrorMessage(err, tr("auth.reset.error", "Unable to reset password.")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="min-h-[72vh] bg-slate-950 px-6 pt-20 pb-10 md:pt-24 md:pb-12 flex items-center justify-center">
        <div className="outer-glass-panel w-full max-w-md mx-auto rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-white md:p-10">
          <div className="space-y-2 text-center">
            <h1 className={authHeadingClass}>{tr("auth.reset.title", "Set New Password")}</h1>
            <p className={authSubtitleClass}>{tr("auth.reset.subtitle", "Choose a strong password for your account.")}</p>
          </div>

          {!token ? (
            <p className="mt-6 text-sm text-red-400">{tr("auth.reset.missing_token", "Missing reset token. Please use the link sent to your email.")}</p>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-black text-white/70">{tr("auth.reset.new_password", "New Password")}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl border-white/20 bg-white/[0.05] pr-11 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? tr("auth.reset.hide_password", "Hide password") : tr("auth.reset.show_password", "Show password")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-black text-white/70">{tr("auth.confirm_password", "Confirm Password")}</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl border-white/20 bg-white/[0.05] pr-11 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? tr("auth.reset.hide_password", "Hide password") : tr("auth.reset.show_password", "Show password")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {status ? <p className="text-green-400 text-sm">{status}</p> : null}
              {error ? <p className="text-red-400 text-sm">{error}</p> : null}

              <Button type="submit" disabled={loading} className="h-12 w-full rounded-full bg-zim-gold text-[11px] font-black uppercase tracking-widest text-zim-black hover:bg-white">
                {loading ? tr("auth.reset.saving", "Saving...") : tr("auth.reset.reset_password", "Reset Password")}
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-white/10 pt-4 text-center text-sm text-white/75">
            <Link href="/login" className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-white/70 hover:text-zim-gold">
              <ArrowLeft className="h-3.5 w-3.5 mr-2" />
              {tr("auth.reset.back_to_login", "Back to Login")}
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
