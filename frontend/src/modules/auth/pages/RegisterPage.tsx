import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { User, Mail, Lock, UserPlus, X, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { api, getApiErrorMessage, saveAuthToken } from "@/lib/api";
import { primeCurrentUserBootstrap } from "@/lib/authSessionBootstrap";

function getPasswordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pw) return { level: 0, label: "", color: "" };
  if (pw.length < 6) return { level: 1, label: "Too short", color: "bg-rose-500" };
  if (pw.length < 8) return { level: 2, label: "Fair — add more characters", color: "bg-amber-400" };
  return { level: 3, label: "Strong password", color: "bg-emerald-400" };
}

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
  const [touched, setTouched] = useState({ fullName: false, email: false, password: false, confirmPassword: false });

  const glassInputStyle =
    "bg-white/[0.05] border-white/10 text-white focus:border-zim-gold/50 focus:ring-zim-gold/20 transition-all rounded-xl h-12";

  const passwordStrength = getPasswordStrength(formData.password);

  const fieldErrors = {
    fullName: touched.fullName && !formData.fullName.trim() ? "Full name is required." : "",
    email:
      touched.email && !formData.email
        ? "Email is required."
        : touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
          ? "Please enter a valid email address."
          : "",
    password:
      touched.password && !formData.password
        ? "Password is required."
        : touched.password && formData.password.length < 8
          ? "Password must be at least 8 characters."
          : "",
    confirmPassword:
      touched.confirmPassword && formData.password !== formData.confirmPassword
        ? "Passwords do not match."
        : "",
  };

  const touch = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
    setError("");

    if (!formData.fullName.trim() || !formData.email || !formData.password || !formData.confirmPassword) return;
    if (formData.password.length < 8) return;
    if (formData.password !== formData.confirmPassword) return;

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
      setError(getApiErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="min-h-[90vh] flex items-center justify-center bg-slate-950 relative overflow-hidden px-6 py-20">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-zim-gold/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-lg p-1 rounded-[2rem] bg-gradient-to-br from-white/10 to-transparent"
        >
          <div className="outer-glass-panel relative rounded-[2rem] border border-white/10 bg-white/[0.02] p-10 md:p-12 space-y-8">
            <button
              onClick={() => setLocation("/")}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-zim-gold hover:bg-white/10 transition-all z-50 group"
              aria-label="Cancel registration"
            >
              <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
            </button>

            <div className="text-center space-y-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                {t("auth.register", { defaultValue: "Create Account" })}
              </h1>
              <p className="text-sm font-light leading-relaxed text-white/75">
                {t("auth.register_subtitle") ||
                  "Start your journey toward impactful diaspora collaboration."}
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black text-white/70 tracking-widest flex items-center gap-2">
                    <User className="h-3.5 w-3.5" /> {t("auth.full_name") || "Full Name"}
                  </Label>
                  <Input
                    type="text"
                    autoComplete="name"
                    className={`${glassInputStyle} ${fieldErrors.fullName ? "border-rose-400/60" : ""}`}
                    value={formData.fullName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                    onBlur={() => touch("fullName")}
                  />
                  {fieldErrors.fullName ? (
                    <p className="flex items-center gap-1.5 text-[11px] text-rose-300">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {fieldErrors.fullName}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black text-white/70 tracking-widest flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" /> {t("auth.email") || "Email Address"}
                  </Label>
                  <Input
                    type="email"
                    autoComplete="email"
                    className={`${glassInputStyle} ${fieldErrors.email ? "border-rose-400/60" : ""}`}
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    onBlur={() => touch("email")}
                  />
                  {fieldErrors.email ? (
                    <p className="flex items-center gap-1.5 text-[11px] text-rose-300">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {fieldErrors.email}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black text-white/70 tracking-widest flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" /> {t("auth.password") || "Password"}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={`${glassInputStyle} pr-11 ${fieldErrors.password ? "border-rose-400/60" : ""}`}
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    onBlur={() => touch("password")}
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
                {formData.password ? (
                  <div className="space-y-1 pt-0.5">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((bar) => (
                        <div
                          key={bar}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength.level >= bar ? passwordStrength.color : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-white/50">{passwordStrength.label}</p>
                  </div>
                ) : (
                  <p className="text-[10px] text-white/35">Minimum 8 characters required.</p>
                )}
                {fieldErrors.password ? (
                  <p className="flex items-center gap-1.5 text-[11px] text-rose-300">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black text-white/70 tracking-widest flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" /> {t("auth.confirm_password") || "Confirm Password"}
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={`${glassInputStyle} pr-11 ${fieldErrors.confirmPassword ? "border-rose-400/60" : ""}`}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    onBlur={() => touch("confirmPassword")}
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
                {fieldErrors.confirmPassword ? (
                  <p className="flex items-center gap-1.5 text-[11px] text-rose-300">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.confirmPassword}
                  </p>
                ) : null}
              </div>

              <div className="flex items-start gap-3 pt-1">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-white/10 bg-white/5 accent-zim-gold"
                  id="terms"
                  required
                />
                <label htmlFor="terms" className="text-[11px] text-white/70 leading-tight cursor-pointer">
                  {t("auth.terms_agreement") ||
                    "I agree to the Terms of Service and Privacy Policy regarding GDPR data governance."}
                </label>
              </div>

              {error ? (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <p className="text-sm text-rose-300 leading-snug">{error}</p>
                </motion.div>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-zim-gold text-zim-black hover:bg-white transition-all duration-300 font-black text-[11px] uppercase tracking-widest h-14 rounded-full shadow-xl shadow-zim-gold/20 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t("auth.register", { defaultValue: "Create Account" })}
                  </>
                )}
              </Button>
            </form>

            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-xs text-white/70">
                {t("auth.have_account") || "Already have an account?"}{" "}
                <Link href="/login" className="text-zim-gold font-bold hover:underline">
                  {t("auth.login_here") || "Sign In"}
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}
