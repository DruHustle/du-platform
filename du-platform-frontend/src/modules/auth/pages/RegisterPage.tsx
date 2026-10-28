import {
  getPasswordIssue,
  PASSWORD_ERROR_MESSAGES,
} from "@/contracts/passwordPolicy";
import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  User,
  Mail,
  Lock,
  UserPlus,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { api, getApiErrorMessage, saveAuthToken } from "@/lib/api";
import { primeCurrentUserBootstrap } from "@/lib/authSessionBootstrap";

export default function Register() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsTouched, setTermsTouched] = useState(false);

  const glassInputStyle =
    "bg-white/[0.05] border-white/10 text-white focus:border-zim-gold/50 focus:ring-zim-gold/20 transition-all rounded-xl h-11";

  const passwordIssue = getPasswordIssue(formData.password);
  const passwordIssueMessage = passwordIssue
    ? t(`auth.password_rules.${passwordIssue}`, {
        defaultValue: PASSWORD_ERROR_MESSAGES[passwordIssue],
      })
    : "";
  const passwordStrength = {
    level: !formData.password ? 0 : passwordIssue ? 2 : 3,
    label: !formData.password
      ? ""
      : passwordIssueMessage ||
        t("auth.password_rules.meets", {
          defaultValue: "Meets password requirements",
        }),
    color: passwordIssue ? "bg-amber-400" : "bg-emerald-400",
  };
  const normalizedFirstName = formData.firstName.trim();
  const normalizedLastName = formData.lastName.trim();
  const normalizedFullName =
    `${normalizedFirstName} ${normalizedLastName}`.trim();

  const fieldErrors = {
    firstName:
      touched.firstName && !normalizedFirstName
        ? "First name is required."
        : "",
    lastName:
      touched.lastName && !normalizedLastName ? "Surname is required." : "",
    email:
      touched.email && !formData.email
        ? "Email is required."
        : touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
          ? "Please enter a valid email address."
          : "",
    password:
      touched.password && !formData.password
        ? "Password is required."
        : touched.password && passwordIssue
          ? passwordIssueMessage
          : "",
    confirmPassword:
      touched.confirmPassword && formData.password !== formData.confirmPassword
        ? "Passwords do not match."
        : "",
  };

  const touch = (field: keyof typeof touched) =>
    setTouched(prev => ({ ...prev, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    setTermsTouched(true);
    setError("");

    if (loading) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) return;
    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    )
      return;
    if (passwordIssue) return;
    if (formData.password !== formData.confirmPassword) return;
    if (!termsAccepted) return;

    setLoading(true);
    try {
      const response = await api.post("/auth/register", {
        fullName: normalizedFullName,
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
      const accessToken = String(response?.data?.accessToken ?? "").trim();
      if (accessToken) saveAuthToken(accessToken);
      primeCurrentUserBootstrap(response?.data?.user ?? null);
      setLocation("/");
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "Registration failed. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="min-h-[82vh] flex items-center justify-center bg-slate-950 relative overflow-hidden px-6 pt-20 pb-10 md:pt-24 md:pb-12">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-zim-gold/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="auth-wrapper relative w-full max-w-lg"
        >
          <div className="content-panel auth-panel relative p-8 md:p-10 space-y-7">
            <button
              onClick={() => setLocation("/")}
              className="absolute top-5 right-5 min-h-11 min-w-11 flex items-center justify-center p-2 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-zim-gold hover:bg-white/10 transition-all z-50 group"
              aria-label={t("auth.cancel_registration", {
                defaultValue: "Cancel registration",
              })}
            >
              <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
            </button>

            <div className="auth-heading text-center space-y-2">
              <h1 className="auth-title text-white">
                {t("auth.register", { defaultValue: "Create Account" })}
              </h1>
              <p className="text-sm font-light leading-relaxed text-white/75">
                {t("auth.register_subtitle") ||
                  "Create a platform account. Browsing and newsletter subscriptions do not require one."}
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="RegisterPage-firstName"
                    className="text-[10px] uppercase font-black text-white/70 tracking-widest flex items-center gap-2"
                  >
                    <User className="h-3.5 w-3.5" />{" "}
                    {t("auth.first_name", { defaultValue: "First Name" })}
                  </Label>
                  <Input
                    id="RegisterPage-firstName"
                    aria-invalid={Boolean(fieldErrors.firstName)}
                    aria-describedby={
                      fieldErrors.firstName
                        ? "RegisterPage-firstName-error"
                        : undefined
                    }
                    type="text"
                    autoComplete="given-name"
                    className={`${glassInputStyle} ${fieldErrors.firstName ? "border-rose-400/60" : ""}`}
                    value={formData.firstName}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    onBlur={() => touch("firstName")}
                  />
                  {fieldErrors.firstName ? (
                    <p
                      id="RegisterPage-firstName-error"
                      role="alert"
                      className="flex items-center gap-1.5 text-[11px] text-rose-300"
                    >
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {fieldErrors.firstName}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="RegisterPage-lastName"
                    className="text-[10px] uppercase font-black text-white/70 tracking-widest flex items-center gap-2"
                  >
                    <User className="h-3.5 w-3.5" />{" "}
                    {t("auth.last_name", { defaultValue: "Surname" })}
                  </Label>
                  <Input
                    id="RegisterPage-lastName"
                    aria-invalid={Boolean(fieldErrors.lastName)}
                    aria-describedby={
                      fieldErrors.lastName
                        ? "RegisterPage-lastName-error"
                        : undefined
                    }
                    type="text"
                    autoComplete="family-name"
                    className={`${glassInputStyle} ${fieldErrors.lastName ? "border-rose-400/60" : ""}`}
                    value={formData.lastName}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    onBlur={() => touch("lastName")}
                  />
                  {fieldErrors.lastName ? (
                    <p
                      id="RegisterPage-lastName-error"
                      role="alert"
                      className="flex items-center gap-1.5 text-[11px] text-rose-300"
                    >
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {fieldErrors.lastName}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="RegisterPage-email"
                  className="text-[10px] uppercase font-black text-white/70 tracking-widest flex items-center gap-2"
                >
                  <Mail className="h-3.5 w-3.5" />{" "}
                  {t("auth.email") || "Email Address"}
                </Label>
                <Input
                  id="RegisterPage-email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={
                    fieldErrors.email ? "RegisterPage-email-error" : undefined
                  }
                  type="email"
                  autoComplete="email"
                  className={`${glassInputStyle} ${fieldErrors.email ? "border-rose-400/60" : ""}`}
                  value={formData.email}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, email: e.target.value }))
                  }
                  onBlur={() => touch("email")}
                />
                {fieldErrors.email ? (
                  <p
                    id="RegisterPage-email-error"
                    role="alert"
                    className="flex items-center gap-1.5 text-[11px] text-rose-300"
                  >
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="RegisterPage-password"
                  className="text-[10px] uppercase font-black text-white/70 tracking-widest flex items-center gap-2"
                >
                  <Lock className="h-3.5 w-3.5" />{" "}
                  {t("auth.password") || "Password"}
                </Label>
                <div className="relative">
                  <Input
                    id="RegisterPage-password"
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={
                      fieldErrors.password
                        ? "RegisterPage-password-error"
                        : undefined
                    }
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={`${glassInputStyle} pr-11 ${fieldErrors.password ? "border-rose-400/60" : ""}`}
                    value={formData.password}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    onBlur={() => touch("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={
                      showPassword
                        ? t("auth.reset.hide_password", {
                            defaultValue: "Hide password",
                          })
                        : t("auth.reset.show_password", {
                            defaultValue: "Show password",
                          })
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
                {formData.password ? (
                  <div className="space-y-1 pt-0.5">
                    <div className="flex gap-1">
                      {[1, 2, 3].map(bar => (
                        <div
                          key={bar}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength.level >= bar
                              ? passwordStrength.color
                              : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-white/50">
                      {passwordStrength.label}
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-white/35">
                    {t("auth.password_minimum", {
                      defaultValue: "Minimum 8 characters required.",
                    })}
                  </p>
                )}
                {fieldErrors.password ? (
                  <p
                    id="RegisterPage-password-error"
                    role="alert"
                    className="flex items-center gap-1.5 text-[11px] text-rose-300"
                  >
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="RegisterPage-confirmPassword"
                  className="text-[10px] uppercase font-black text-white/70 tracking-widest flex items-center gap-2"
                >
                  <Lock className="h-3.5 w-3.5" />{" "}
                  {t("auth.confirm_password") || "Confirm Password"}
                </Label>
                <div className="relative">
                  <Input
                    id="RegisterPage-confirmPassword"
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    aria-describedby={
                      fieldErrors.confirmPassword
                        ? "RegisterPage-confirmPassword-error"
                        : undefined
                    }
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={`${glassInputStyle} pr-11 ${fieldErrors.confirmPassword ? "border-rose-400/60" : ""}`}
                    value={formData.confirmPassword}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    onBlur={() => touch("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
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
                {fieldErrors.confirmPassword ? (
                  <p
                    id="RegisterPage-confirmPassword-error"
                    role="alert"
                    className="flex items-center gap-1.5 text-[11px] text-rose-300"
                  >
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.confirmPassword}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <div className="flex items-start gap-3 pt-1">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-white/10 bg-white/5 accent-zim-gold"
                    id="terms"
                    checked={termsAccepted}
                    onChange={e => {
                      setTermsAccepted(e.target.checked);
                      setTermsTouched(true);
                    }}
                  />
                  <label
                    htmlFor="terms"
                    className="text-[11px] text-white/70 leading-tight cursor-pointer"
                  >
                    {t("auth.terms_agreement") ||
                      "I agree to the Terms of Service and Privacy Policy regarding GDPR data governance."}
                  </label>
                </div>
                {termsTouched && !termsAccepted ? (
                  <p className="flex items-center gap-1.5 text-[11px] text-rose-300 pl-7">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {t("auth.terms_required", {
                      defaultValue: "You must accept the terms to continue.",
                    })}
                  </p>
                ) : null}
              </div>

              {error ? (
                <motion.div
                  role="alert"
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
                className="w-full bg-zim-gold text-zim-black hover:bg-white transition-all duration-300 font-black text-[11px] uppercase tracking-widest h-12 rounded-full shadow-xl shadow-zim-gold/20 disabled:opacity-70"
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
                <Link
                  href="/login"
                  className="text-zim-gold font-bold hover:underline"
                >
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
