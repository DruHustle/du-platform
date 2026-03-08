import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { User, Mail, Lock, UserPlus, X, Eye, EyeOff } from "lucide-react";
import { Link, useLocation } from "wouter";
import { api, getApiErrorMessage, saveAuthToken } from "@/lib/api";
import { primeCurrentUserBootstrap } from "@/lib/authSessionBootstrap";

export default function Register() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const glassInputStyle = "bg-white/[0.05] border-white/10 text-white focus:border-zim-gold/50 focus:ring-zim-gold/20 transition-all rounded-xl h-12";
  const authHeadingClass = "text-xl font-black tracking-tight text-white";
  const authSubtitleClass = "text-sm font-light leading-relaxed text-white/75";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/register", {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
      const accessToken = String(response?.data?.accessToken ?? "").trim();
      if (accessToken) saveAuthToken(accessToken);
      primeCurrentUserBootstrap(response?.data?.user ?? null);
      setLocation("/");
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Registration failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="min-h-[90vh] flex items-center justify-center bg-slate-950 relative overflow-hidden px-6 py-20">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-zim-gold/5 blur-[120px] rounded-full pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-lg p-1 rounded-[2rem] bg-gradient-to-br from-white/10 to-transparent"
        >
          <div className="outer-glass-panel relative rounded-[2rem] border border-white/10 bg-white/[0.02] p-10 md:p-12 space-y-8">
            
            {/* --- CANCEL BUTTON --- */}
            <button 
              onClick={() => setLocation("/")}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-zim-gold hover:bg-white/10 transition-all z-50 group"
              aria-label="Cancel registration"
            >
              <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
            </button>

            <div className="text-center space-y-2">
              <h1 className={authHeadingClass}>{t('auth.register', { defaultValue: "Register" })}</h1>
              <p className={authSubtitleClass}>{t('auth.register_subtitle') || "Start your journey toward impactful diaspora collaboration."}</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-white/70 tracking-widest flex items-center gap-2">
                    <User className="h-3.5 w-3.5" /> {t('auth.full_name') || "Full Name"}
                  </Label>
                  <Input
                    type="text"
                    className={glassInputStyle}
                    value={formData.fullName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-white/70 tracking-widest flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" /> {t('auth.email') || "Email Address"}
                  </Label>
                  <Input
                    type="email"
                    className={glassInputStyle}
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-white/70 tracking-widest flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" /> {t('auth.password') || "Password"}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    className={`${glassInputStyle} pr-11`}
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-white/70 tracking-widest flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" /> {t('auth.confirm_password') || "Confirm Password"}
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`${glassInputStyle} pr-11`}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2">
                <input type="checkbox" className="mt-1 h-4 w-4 rounded border-white/10 bg-white/5 accent-zim-gold" id="terms" required />
                <label htmlFor="terms" className="text-[11px] text-white/70 leading-tight cursor-pointer">
                  {t('auth.terms_agreement') || "I agree to the Terms of Service and Privacy Policy regarding GDPR data governance."}
                </label>
              </div>

              {error ? <p className="text-red-400 text-sm">{error}</p> : null}

              <Button type="submit" disabled={loading} className="w-full bg-zim-gold text-zim-black hover:bg-white transition-all duration-300 font-black text-[11px] uppercase tracking-widest h-14 rounded-full shadow-xl shadow-zim-gold/20">
                <UserPlus className="mr-2 h-4 w-4" /> {t('auth.register', { defaultValue: "Register" })}
              </Button>
            </form>

            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-xs text-white/70">
                {t('auth.have_account') || "Already have an account?"}{' '}
                <Link href="/login" className="text-zim-gold font-bold hover:underline">
                  {t('auth.login_here') || "Login Here"}
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}
