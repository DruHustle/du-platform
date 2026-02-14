import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Mail, Phone, User, MessageSquare } from "lucide-react";

interface ContactFormProps {
  title?: string;
  description?: string;
  module: "general" | "technology" | "export" | "tourism" | "investment" | "trade" | "data" | "success";
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

  const subjectOptions = {

      general: [ 
        "General Inquiry",
        "Platform Feedback",
        "Request",
        "Partnership Inquiry"
      ],
    technology: [
      "AI Integration Inquiry",
      "Technology Partnership",
      "Data Solutions",
      "Digital Transformation",
      "General Inquiry"
    ],  
    data: [
      "Data Analytics Inquiry",
      "Data Privacy",
      "Data Governance",
      "Data Integration",
      "General Inquiry"
    ],
    export: [
      "German Market Requirements",
      "Certification Support",
      "Partner Connections",
      "Export Documentation",
      "General Inquiry"
    ],
    tourism: [
      "Tour Package Inquiry",
      "Visa Information",
      "Accommodation Booking",
      "Diaspora Homecoming",
      "General Inquiry"
    ],
    investment: [
      "Investment Opportunity",
      "NTIR Registration",
      "Project Information",
      "Due Diligence",
      "General Inquiry"
    ],
    trade: [
      "Export Development Programs",
      "Market Access",
      "Trade Regulations",
      "Partnership Opportunities",
      "General Inquiry"
    ],

    success: [
      "Share Your Story",
      "Project Showcase",
      "Success Metrics",
      "Partnership Inquiry",
      "General Inquiry"
    ],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast.success(t('contact_form.success_msg'), {
      description: t('contact_form.success_desc'),
    });

    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    });
    setIsSubmitting(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const currentOptions =
    module in subjectOptions
      ? subjectOptions[module as keyof typeof subjectOptions]
      : ["General Inquiry"];

  return (
    <Card className="border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle className="text-2xl">
          {title || t('contact_form.get_started')}
        </CardTitle>
        <CardDescription>
          {description || t('contact_form.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('contact_form.full_name')} *
              </Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('contact_form.email')} *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {t('contact_form.phone')}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+263 xxx xxx xxx"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('contact_form.subject')} *
              </Label>
              <Select
                value={formData.subject}
                onValueChange={(value) => handleChange("subject", value)}
                required
              >
                <SelectTrigger id="subject">
                  <SelectValue placeholder={t('contact_form.select_subject')} />
                </SelectTrigger>
                <SelectContent>
                  {currentOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">
              {t('contact_form.message')} *
            </Label>
            <Textarea
              id="message"
              placeholder={t('contact_form.message_placeholder')}
              rows={6}
              value={formData.message}
              onChange={(e) => handleChange("message", e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full md:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? t('contact_form.sending') : t('contact_form.send')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
