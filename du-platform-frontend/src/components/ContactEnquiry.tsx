import { useState } from "react";
import { useTranslation } from "react-i18next";
import { customerLanguage } from "@shared/customerLanguage";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { api } from "@/lib/api";
import {
  prepareContactAttempt,
  clearContactAttempt,
} from "@/lib/contactAttempt";
const empty = { name: "", email: "", phone: "", subject: "", message: "" };
export default function ContactEnquiry() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(empty),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...Object.fromEntries(
          Object.entries(draft).map(([k, v]) => [k, v.trim()])
        ),
        language: customerLanguage(i18n.resolvedLanguage),
        module: "general",
      };
      const requestId = await prepareContactAttempt(payload);
      const { data } = await api.post("/notifications/contact", {
        ...payload,
        requestId,
      });
      if (data.received !== true || data.requestId !== requestId)
        throw new Error("UNCONFIRMED");
      setReceipt(requestId);
      setDraft(empty);
      clearContactAttempt();
    } catch (e: any) {
      setError(
        t(
          e?.message === "CONTACT_MESSAGE_CHANGED" ||
            e?.response?.status === 409
            ? "contact_enquiry.changed"
            : "contact_enquiry.failed"
        )
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!busy) setOpen(value);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="min-h-11 text-xs text-yellow-400 underline underline-offset-4"
        >
          {t("contact_enquiry.open")}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto bg-slate-950 text-white sm:max-w-lg [&_button]:min-h-11">
        <DialogTitle>{t("contact_enquiry.title")}</DialogTitle>
        <DialogDescription className="text-slate-300">
          {t("contact_enquiry.scope")}
        </DialogDescription>
        {receipt ? (
          <div role="status" className="space-y-4 break-words">
            <p>{t("contact_enquiry.received")}</p>
            <p>
              {t("contact_enquiry.reference")}: {receipt}
            </p>
            <Button onClick={() => setReceipt("")}>
              {t("contact_enquiry.new")}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
            {(["name", "email", "phone", "subject", "message"] as const).map(
              field => (
                <label key={field} className="block space-y-2 text-sm">
                  <span>{t(`contact_enquiry.${field}`)}</span>
                  {field === "message" ? (
                    <Textarea
                      name={field}
                      required
                      maxLength={4000}
                      value={draft[field]}
                      disabled={busy}
                      onChange={e =>
                        setDraft({ ...draft, [field]: e.target.value })
                      }
                      className="min-h-32"
                    />
                  ) : (
                    <Input
                      name={field}
                      type={
                        field === "email"
                          ? "email"
                          : field === "phone"
                            ? "tel"
                            : "text"
                      }
                      autoComplete={
                        field === "name"
                          ? "name"
                          : field === "email"
                            ? "email"
                            : field === "phone"
                              ? "tel"
                              : "off"
                      }
                      required={field !== "phone"}
                      maxLength={
                        { name: 120, email: 254, phone: 30, subject: 200 }[
                          field
                        ]
                      }
                      value={draft[field]}
                      disabled={busy}
                      onChange={e =>
                        setDraft({ ...draft, [field]: e.target.value })
                      }
                    />
                  )}
                </label>
              )
            )}
            {error && (
              <div role="alert" className="space-y-2 text-amber-200">
                <p>{error}</p>
                <button
                  type="button"
                  className="min-h-11 underline"
                  onClick={() => {
                    clearContactAttempt();
                    setError("");
                  }}
                >
                  {t("contact_enquiry.new")}
                </button>
              </div>
            )}
            <p className="text-xs text-slate-300">
              <a href="/privacy-policy" className="underline">
                {t("privacy_policy")}
              </a>
            </p>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {t(busy ? "contact_enquiry.saving" : "contact_enquiry.submit")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
