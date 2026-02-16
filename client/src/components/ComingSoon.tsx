import React, { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Bell, Construction, CheckCircle2, X, UserPlus, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ContactForm from "./ContactForm"; // Importing your existing form

interface ComingSoonProps {
  children: React.ReactNode;
  featureName: string;
}

export default function ComingSoon({ children, featureName }: ComingSoonProps) {
  const { t } = useTranslation();
  
  // Simulation: Replace with your actual auth logic (e.g., from an AuthContext)
  const [isUserRegistered] = useState(false); 
  
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleNotifyMe = async () => {
    if (!isUserRegistered) {
      // Logic for unregistered users: Open the contact lead form
      setShowContactForm(true);
      return;
    }

    // Logic for registered users: Direct subscription
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubscribed(true);
    setIsLoading(false);
    
    toast.success(t('common.notify_success') || "Priority Access Locked", {
      description: `You will be notified when ${featureName} is ready.`,
    });
  };

  return (
    <Dialog onOpenChange={(open) => {
      if (!open) {
        setIsSubscribed(false);
        setShowContactForm(false);
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-md p-0 bg-slate-950 border-white/10 overflow-hidden rounded-[2.5rem] shadow-[0_0_50px_rgba(212,175,55,0.1)] outline-none">
        <DialogClose className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-zim-gold hover:bg-white/10 transition-all z-50 group outline-none">
          <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
        </DialogClose>

        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.05)_0%,transparent_60%)] pointer-events-none" />
        
        <div className="p-8 md:p-12 relative z-10 text-center">
          <AnimatePresence mode="wait">
            {!showContactForm ? (
              <motion.div
                key="coming-soon-main"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Icon Header */}
                <div className="mx-auto h-20 w-20 bg-zim-gold/10 rounded-3xl flex items-center justify-center border border-zim-gold/20">
                  {isSubscribed ? <CheckCircle2 className="h-10 w-10 text-zim-gold" /> : <Construction className="h-10 w-10 text-zim-gold" />}
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">{featureName}</h2>
                  <span className="text-[10px] font-black text-zim-gold uppercase tracking-[0.3em]">Coming Soon</span>
                </div>

                <p className="text-sm text-white/50 font-light leading-relaxed">
                  {isSubscribed 
                    ? "Priority access granted. We'll alert you via your registered email."
                    : "This module is reserved for our community. Register your interest to get beta access."}
                </p>

                <div className="pt-4">
                  {!isSubscribed ? (
                    <Button 
                      onClick={handleNotifyMe}
                      disabled={isLoading}
                      className="w-full bg-zim-gold text-zim-black hover:bg-white transition-all duration-300 font-black text-[11px] uppercase tracking-widest h-14 rounded-full"
                    >
                      {isLoading ? "Processing..." : isUserRegistered ? "Notify Me" : "Register for Access"}
                    </Button>
                  ) : (
                    <div className="h-14 rounded-full border border-zim-gold/30 bg-zim-gold/5 flex items-center justify-center text-zim-gold font-black text-[11px] uppercase tracking-[0.2em]">
                      <Sparkles className="h-4 w-4 mr-2" /> Access Locked
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="lead-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="text-left mb-4">
                  <h3 className="text-xl font-black text-white">{t('common.get_notified') || "Request Access"}</h3>
                  <p className="text-xs text-white/40">{t('common.form_subtitle') || "Fill in your details to join the waiting list for " + featureName}</p>
                </div>
                
                {/* Reusing your existing ContactForm component set to 'success' module */}
                <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/[0.02]">
                  <ContactForm module="success" title="Access Request" />
                </div>
                
                <button 
                  onClick={() => setShowContactForm(false)}
                  className="text-[10px] uppercase font-black text-white/20 hover:text-white transition-colors tracking-[0.2em]"
                >
                  Go Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}