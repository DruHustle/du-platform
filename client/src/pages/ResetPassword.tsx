import { useState } from "react";
import { Link, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

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
      setError(err?.response?.data?.message ?? "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="min-h-[80vh] bg-slate-950 px-6 py-28">
        <div className="max-w-md mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-white">
          <h1 className="text-3xl font-black tracking-tighter">Set New Password</h1>
          <p className="text-white/60 text-sm mt-2">Choose a strong password for your account.</p>

          {!token ? (
            <p className="text-red-400 mt-4 text-sm">Missing reset token. Please use the link sent to your email.</p>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-white/50">New Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/[0.05] border-white/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-white/50">Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-white/[0.05] border-white/20 text-white"
                />
              </div>

              {status ? <p className="text-green-400 text-sm">{status}</p> : null}
              {error ? <p className="text-red-400 text-sm">{error}</p> : null}

              <Button type="submit" disabled={loading} className="w-full bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest">
                {loading ? "Saving..." : "Reset Password"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-sm text-white/60">
            <Link href="/login" className="text-zim-gold hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

