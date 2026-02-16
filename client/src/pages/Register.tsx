import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { User, Mail, Lock, UserPlus, X } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Register() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const glassInputStyle = "bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 focus:border-zim-gold/50 focus:ring-zim-gold/20 transition-all rounded-xl h-12";

  return (
    <Layout>
      <section className="min-h-[90vh] flex items-center justify-center bg-slate-950 relative overflow-hidden px-6 py-20">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-zim-gold/5 blur-[120px] rounded-full pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-lg p-1 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent"
        >
          <div className="relative bg-slate-900/40 backdrop-blur-3xl p-10 md:p-12 rounded-[2.4rem] border border-white/5 space-y-8">
            
            {/* --- CANCEL BUTTON --- */}
            <button 
              onClick={() => setLocation("/")}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-zim-gold hover:bg-white/10 transition-all z-50 group"
              aria-label="Cancel registration"
            >
              <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
            </button>

            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black text-white tracking-tighter">{t('auth.create_account') || "Join ZIGD"}</h1>
              <p className="text-sm text-white/40 font-light">{t('auth.register_subtitle') || "Start your journey toward impactful diaspora investment."}</p>
            </div>

            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest flex items-center gap-2">
                    <User className="h-3.5 w-3.5" /> {t('auth.full_name')}
                  </Label>
                  <Input type="text" className={glassInputStyle} placeholder="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" /> {t('auth.email')}
                  </Label>
                  <Input type="email" className={glassInputStyle} placeholder="jane@example.com" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" /> {t('auth.password')}
                </Label>
                <Input type="password" className={glassInputStyle} />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" /> {t('auth.confirm_password')}
                </Label>
                <Input type="password" className={glassInputStyle} />
              </div>

              <div className="flex items-start gap-3 pt-2">
                <input type="checkbox" className="mt-1 h-4 w-4 rounded border-white/10 bg-white/5 accent-zim-gold" id="terms" required />
                <label htmlFor="terms" className="text-[11px] text-white/40 leading-tight cursor-pointer">
                  {t('auth.terms_agreement') || "I agree to the Terms of Service and Privacy Policy regarding data governance."}
                </label>
              </div>

              <Button className="w-full bg-zim-gold text-zim-black hover:bg-white transition-all duration-300 font-black text-[11px] uppercase tracking-widest h-14 rounded-full shadow-xl shadow-zim-gold/20">
                <UserPlus className="mr-2 h-4 w-4" /> {t('auth.create_account')}
              </Button>
            </form>

            <div className="text-center pt-4 border-t border-white/5">
              <p className="text-xs text-white/40">
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