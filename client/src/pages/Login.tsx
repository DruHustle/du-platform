import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Mail, Lock, LogIn as LoginIcon, X } from "lucide-react"; // Renamed icon to avoid conflict
import { Link, useLocation } from "wouter";

export default function Login() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({ email: "", password: "" });

  const glassInputStyle = "bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 focus:border-zim-gold/50 focus:ring-zim-gold/20 transition-all rounded-xl h-12";

  return (
    <Layout>
      <section className="min-h-[90vh] flex items-center justify-center bg-slate-950 relative overflow-hidden px-6 py-20">
        {/* Background Depth Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-zim-gold/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-md p-1 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent shadow-2xl"
        >
          <div className="relative bg-slate-900/40 backdrop-blur-3xl p-10 md:p-12 rounded-[2.4rem] border border-white/5 space-y-8">
            
            {/* --- CANCEL BUTTON --- */}
            <button 
              onClick={() => setLocation("/")}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-zim-gold hover:bg-white/10 transition-all z-50 group"
              aria-label="Cancel login"
            >
              <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
            </button>

            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black text-white tracking-tighter">{t('auth.welcome_back') || "Welcome Back"}</h1>
              <p className="text-sm text-white/40 font-light">{t('auth.login_subtitle') || "Access your digital gateway to Zimbabwe."}</p>
            </div>

            <form className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> {t('auth.email')}
                </Label>
                <Input 
                  type="email" 
                  className={glassInputStyle} 
                  placeholder="name@example.com" 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" /> {t('auth.password')}
                  </Label>
                    <Link href="/forgot-password">
                    <a className="text-[10px] uppercase font-black text-zim-gold/60 hover:text-zim-gold transition-colors tracking-widest cursor-pointer">
                        {t('auth.forgot_password')}
                    </a>
                    </Link>
                </div>
                <Input 
                  type="password" 
                  className={glassInputStyle} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <Button className="w-full bg-zim-gold text-zim-black hover:bg-white transition-all duration-300 font-black text-[11px] uppercase tracking-widest h-14 rounded-full shadow-xl shadow-zim-gold/20">
                <LoginIcon className="mr-2 h-4 w-4" /> {t('auth.login')}
              </Button>
            </form>

            <div className="text-center pt-4 border-t border-white/5">
              <p className="text-xs text-white/40">
                {t('auth.no_account') || "Don't have an account?"}{' '}
                <Link href="/register" className="text-zim-gold font-bold hover:underline">
                  {t('auth.register_now') || "Register Now"}
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}