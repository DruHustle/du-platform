import React, { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Construction, CheckCircle2, X } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface ComingSoonProps {
  children: React.ReactNode;
  featureName: string;
}

export default function ComingSoon({ children, featureName }: ComingSoonProps) {
  const { t } = useTranslation();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleNotifyMe = async () => {
    try {
      setIsLoading(true);
      await api.get("/auth/me");
      const { data } = await api.post("/feature-notifications", { feature: featureName });
      setIsSubscribed(true);
      toast.success(t("common.notify_success") || "Notify request saved", {
        description:
          data?.created === false
            ? `You are already on the notify list for ${featureName}.`
            : `You will be notified when ${featureName} is ready.`,
      });
    } catch (error: any) {
      const status = Number(error?.response?.status ?? 0);
      if (status === 401) {
        const nextPath = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/login?next=${encodeURIComponent(nextPath)}`;
        return;
      }
      toast.error("Unable to save notify request", {
        description: String(error?.response?.data?.message ?? "Please try again."),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => {
      if (!open) {
        setIsSubscribed(false);
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-md p-0 bg-slate-950 border-white/10 overflow-hidden rounded-[2rem] shadow-[0_0_50px_rgba(212,175,55,0.1)] outline-none">
        <DialogClose className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10  hover:text-zim-gold hover:bg-white/10 transition-all z-50 group outline-none">
          <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
        </DialogClose>

        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.05)_0%,transparent_60%)] pointer-events-none" />
        
        <div className="p-8 md:p-12 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="mx-auto h-20 w-20 bg-zim-gold/10 rounded-3xl flex items-center justify-center border border-zim-gold/20">
              {isSubscribed ? <CheckCircle2 className="h-10 w-10 text-zim-gold" /> : <Construction className="h-10 w-10 text-zim-gold" />}
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">{featureName}</h2>
              <span className="text-[10px] font-black text-zim-gold uppercase tracking-[0.3em]">Coming Soon</span>
            </div>

            <p className="text-sm  font-light leading-relaxed">
              {isSubscribed
                ? "Notify request saved. We will alert you via your account email."
                : "Get notified as soon as this feature is available."}
            </p>

            <div className="pt-4">
              {!isSubscribed ? (
                <Button
                  onClick={handleNotifyMe}
                  disabled={isLoading}
                  className="w-full bg-zim-gold text-zim-black hover:bg-white transition-all duration-300 font-black text-[11px] uppercase tracking-widest h-14 rounded-full"
                >
                  {isLoading ? "Processing..." : "Notify me"}
                </Button>
              ) : (
                <div className="h-14 rounded-full border border-zim-gold/30 bg-zim-gold/5 flex items-center justify-center text-zim-gold font-black text-[11px] uppercase tracking-[0.2em]">
                  <Sparkles className="h-4 w-4 mr-2" /> Notified
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
