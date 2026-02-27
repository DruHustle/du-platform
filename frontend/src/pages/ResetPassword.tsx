import { useState } from "react";
import { Link, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getApiErrorMessage } from "@/lib/api";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

function getTokenFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("token") ?? "";
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token] = useState(getTokenFromUrl());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      setStatus(data.message ?? "Password reset successful.");
      setTimeout(() => setLocation("/login"), 900);
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Unable to reset password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="min-h-[80vh] bg-slate-950 px-6 py-28">
        <div className="outer-glass-panel max-w-md mx-auto rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-white">
          <h1 className="text-3xl font-black tracking-tighter">Set New Password</h1>
          <p className="text-white/75 text-sm mt-2">Choose a strong password for your account.</p>

          {!token ? (
            <p className="text-red-400 mt-4 text-sm">Missing reset token. Please use the link sent to your email.</p>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-white/50">New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/[0.05] border-white/20 text-white pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-white/50">Confirm Password</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-white/[0.05] border-white/20 text-white pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {status ? <p className="text-green-400 text-sm">{status}</p> : null}
              {error ? <p className="text-red-400 text-sm">{error}</p> : null}

              <Button type="submit" disabled={loading} className="w-full bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest">
                {loading ? "Saving..." : "Reset Password"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-sm text-white/75">
            <Link href="/login" className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-white/70 hover:text-zim-gold">
              <ArrowLeft className="h-3.5 w-3.5 mr-2" />
              Back to Login
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
