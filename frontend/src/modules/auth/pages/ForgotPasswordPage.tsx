import { useState } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getApiErrorMessage } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const authHeadingClass = "text-xl font-black tracking-tight text-white";
  const authSubtitleClass = "text-sm font-light leading-relaxed text-white/75";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setStatus(data.message ?? tr("auth.forgot.request_sent", "If this email exists, a reset link has been sent."));
      setEmail("");
    } catch (err: any) {
      setError(getApiErrorMessage(err, tr("auth.forgot.request_error", "Unable to submit request.")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="min-h-[80vh] bg-slate-950 px-6 py-20 flex items-center justify-center">
        <div className="outer-glass-panel w-full max-w-md mx-auto rounded-[2rem] border border-white/10 bg-white/[0.02] p-10 text-white md:p-12">
          <div className="space-y-2 text-center">
            <h1 className={authHeadingClass}>{tr("auth.forgot.title", "Reset Password")}</h1>
            <p className={authSubtitleClass}>{tr("auth.forgot.subtitle", "Enter your account email and we will send reset instructions.")}</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest font-black text-white/70">{tr("auth.email", "Email")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl border-white/20 bg-white/[0.05] text-white"
              />
            </div>

            {status ? <p className="text-green-400 text-sm">{status}</p> : null}
            {error ? <p className="text-red-400 text-sm">{error}</p> : null}

            <Button type="submit" disabled={loading} className="h-14 w-full rounded-full bg-zim-gold text-[11px] font-black uppercase tracking-widest text-zim-black hover:bg-white">
              {loading ? tr("auth.forgot.submitting", "Submitting...") : tr("auth.forgot.send_reset_link", "Send Reset Link")}
            </Button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-4 text-center text-sm text-white/75">
            <Link href="/login" className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-white/70 hover:text-zim-gold">
              <ArrowLeft className="h-3.5 w-3.5 mr-2" />
              {tr("auth.forgot.back_to_login", "Back to Login")}
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
