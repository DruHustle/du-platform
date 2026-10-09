import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Mail, Phone, User, MessageSquare, Send, Sparkles, AlertCircle } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";

interface ContactFormProps {
  title?: string;
  description?: string;
  module: "general" | "technology" | "export" | "tourism" | "investment" | "data" | "success";
}

export default function ContactForm({ title, description, module }: ContactFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState("");

  const subjectOptions = {
    general: [
      t("contact_form.subject_options.general.inquiry", { defaultValue: "General Inquiry" }),
      t("contact_form.subject_options.general.feedback", { defaultValue: "Platform Feedback" }),
      t("contact_form.subject_options.general.partnership", { defaultValue: "Partnership Inquiry" }),
    ],
    technology: [
      t("contact_form.subject_options.technology.ai", { defaultValue: "AI Integration" }),
      t("contact_form.subject_options.technology.transformation", { defaultValue: "Digital Transformation" }),
      t("contact_form.subject_options.general.inquiry", { defaultValue: "General Inquiry" }),
    ],
    data: [
      t("contact_form.subject_options.data.analytics", { defaultValue: "Analytics Inquiry" }),
      t("contact_form.subject_options.data.privacy", { defaultValue: "Privacy & Governance" }),
      t("contact_form.subject_options.general.inquiry", { defaultValue: "General Inquiry" }),
    ],
    export: [
      t("contact_form.subject_options.export.market", { defaultValue: "German Market Requirements" }),
      t("contact_form.subject_options.export.certification", { defaultValue: "Certification Support" }),
      t("contact_form.subject_options.export.partners", { defaultValue: "Partner Connections" }),
    ],
    tourism: [
      t("contact_form.subject_options.tourism.visa", { defaultValue: "Visa Information" }),
      t("contact_form.subject_options.tourism.accommodation", { defaultValue: "Accommodation" }),
      t("contact_form.subject_options.tourism.homecoming", { defaultValue: "Diaspora Homecoming" }),
    ],
    investment: [
      t("contact_form.subject_options.investment.opportunities", { defaultValue: "Opportunity Details" }),
      t("contact_form.subject_options.investment.ntir", { defaultValue: "NTIR Registration" }),
      t("contact_form.subject_options.investment.due_diligence", { defaultValue: "Due Diligence" }),
    ],
    success: [
      t("contact_form.subject_options.general.partnership", { defaultValue: "Partnership Inquiry" }),
      t("contact_form.subject_options.success.collaboration", { defaultValue: "Project Collaboration" }),
      t("contact_form.subject_options.general.inquiry", { defaultValue: "General Inquiry" }),
    ],
  };

  const fieldErrors = {
    name: touched.name && !formData.name.trim()
      ? t("contact_form.errors.name_required", { defaultValue: "Full name is required." })
      : "",
    email: touched.email && !formData.email.trim()
      ? t("contact_form.errors.email_required", { defaultValue: "Email is required." })
      : touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
        ? t("contact_form.errors.email_invalid", { defaultValue: "Please enter a valid email address." })
        : "",
    subject: touched.subject && !formData.subject
      ? t("contact_form.errors.subject_required", { defaultValue: "Please select a subject." })
      : "",
    message: touched.message && !formData.message.trim()
      ? t("contact_form.errors.message_required", { defaultValue: "Message is required." })
      : "",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, subject: true, message: true });
    setSubmitError("");

    if (!formData.name.trim() || !formData.email.trim() || !formData.subject || !formData.message.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return;

    setIsSubmitting(true);
    try {
      await api.post("/notifications/contact", { ...formData, module });
      toast.success(t("contact_form.success_msg"), { description: t("contact_form.success_desc") });
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      setTouched({});
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, t("contact_form.errors.submit_failed", { defaultValue: "Unable to send your message. Please try again." })));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const currentOptions = module in subjectOptions
    ? subjectOptions[module as keyof typeof subjectOptions]
    : [t("contact_form.subject_options.general.inquiry", { defaultValue: "General Inquiry" })];

  // Reusable input style
  const glassInputStyle = "bg-white/[0.05] border-white/10 text-white  focus:border-zim-gold/50 focus:ring-zim-gold/20 transition-all rounded-xl";

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500">
      {/* Internal Crispy Edge */}
      <span className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none z-20" />
      
      {/* Decorative Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-zim-gold/5 blur-[80px] pointer-events-none" />

      <div className="p-8 md:p-12 relative z-10">
        <div className="mb-10 space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zim-gold/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-zim-gold" />
            </div>
            <span className="text-zim-gold text-[10px] font-black uppercase tracking-[0.3em]">
              {t("contact_form.module_support", { module, defaultValue: "{{module}} support" })}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
            {title || t('contact_form.get_started')}
          </h2>
          <p className="text-sm  font-light max-w-lg">
            {description || t('contact_form.description')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] uppercase font-black  tracking-widest flex items-center gap-2">
                <User className="h-3 w-3" /> {t('contact_form.full_name')} *
              </Label>
              <Input
                id="name"
                className={glassInputStyle}
                placeholder={t("contact_form.full_name_placeholder", { defaultValue: "Full Name" })}
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] uppercase font-black  tracking-widest flex items-center gap-2">
                <Mail className="h-3 w-3" /> {t('contact_form.email')} *
              </Label>
              <Input
                id="email"
                type="email"
                className={glassInputStyle}
                placeholder={t("contact_form.email_placeholder", { defaultValue: "email@example.com" })}
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[10px] uppercase font-black  tracking-widest flex items-center gap-2">
                <Phone className="h-3 w-3" /> {t('contact_form.phone')}
              </Label>
              <Input
                id="phone"
                type="tel"
                className={glassInputStyle}
                placeholder={t("contact_form.phone_placeholder", { defaultValue: "+ ..." })}
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-[10px] uppercase font-black  tracking-widest flex items-center gap-2">
                <MessageSquare className="h-3 w-3" /> {t('contact_form.subject')} *
              </Label>
              <Select
                value={formData.subject}
                onValueChange={(value) => handleChange("subject", value)}
                required
              >
                <SelectTrigger id="subject" className={glassInputStyle}>
                  <SelectValue placeholder={t('contact_form.select_subject')} />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white backdrop-blur-xl">
                  {currentOptions.map((option) => (
                    <SelectItem key={option} value={option} className="focus:bg-zim-gold focus:text-zim-black">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-[10px] uppercase font-black  tracking-widest">
              {t('contact_form.message')} *
            </Label>
            <Textarea
              id="message"
              className={`${glassInputStyle} resize-none`}
              placeholder={t('contact_form.message_placeholder')}
              rows={5}
              value={formData.message}
              onChange={(e) => handleChange("message", e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full md:w-auto bg-zim-gold text-zim-black hover:bg-white hover:scale-105 transition-all duration-300 font-black text-[11px] uppercase tracking-widest h-12 rounded-full px-10 shadow-xl shadow-zim-gold/20"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="h-3 w-3 border-2 border-zim-black/30 border-t-zim-black rounded-full animate-spin" />
                {t('contact_form.sending')}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" /> {t('contact_form.send')}
              </span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
