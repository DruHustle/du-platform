import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

function readLink() {
  return new URLSearchParams(window.location.hash.slice(1));
}

export default function NewsletterPreferencesPage() {
  const { t } = useTranslation();
  const [input, setInput] = useState(readLink);
  const token = input.get("token") || "";
  const action = input.get("action") || "";
  const linkVersion = useRef(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const valid =
    /^[a-f0-9]{48}$/.test(token) &&
    ["confirm", "unsubscribe"].includes(action);
  // Preference tokens stay out of server access logs, referrers and browser history.
  useEffect(() => {
    const stripFragment = () => window.history.replaceState(
      window.history.state, "", window.location.pathname + window.location.search
    );
    const useNewLink = () => {
      linkVersion.current++;
      setInput(readLink());
      setBusy(false);
      setDone("");
      setError("");
      stripFragment();
    };
    stripFragment();
    window.addEventListener("hashchange", useNewLink);
    return () => {
      linkVersion.current++;
      window.removeEventListener("hashchange", useNewLink);
    };
  }, []);
  const submit = async () => {
    if (busy) return;
    const version = linkVersion.current;
    setBusy(true);
    setError("");
    try {
      await api.post(`/newsletter/${action}`, {
        token,
      });
      if (version !== linkVersion.current) return;
      setDone(
        t(
          action === "confirm"
            ? "newsletter_preferences.confirmed"
            : "newsletter_preferences.unsubscribed"
        )
      );
    } catch (err: any) {
      if (version !== linkVersion.current) return;
      setError(
        t(
          err?.response?.status === 400
            ? "newsletter_preferences.link_expired"
            : "newsletter_preferences.error"
        )
      );
    } finally {
      if (version === linkVersion.current) setBusy(false);
    }
  };
  return (
    <Layout>
      <section className="document-section min-h-[65vh]">
        <div className="container status-page-shell">
          <div className="content-panel editorial-panel text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-zim-gold">
              {t("newsletter_preferences.brand")}
            </p>
            <h1 className="page-title mt-4">
              {action === "unsubscribe"
                ? t("newsletter_preferences.manage_title")
                : t("newsletter_preferences.confirm_title")}
            </h1>
            {done ? (
              <p role="status" className="mt-6 leading-7 text-emerald-200">
                {done}
              </p>
            ) : !valid ? (
              <p role="alert" className="mt-6 leading-7 text-slate-300">
                {t("newsletter_preferences.invalid_link")}
              </p>
            ) : (
              <>
                <p className="mt-6 leading-7 text-slate-300">
                  {action === "unsubscribe"
                    ? t("newsletter_preferences.unsubscribe_help")
                    : t("newsletter_preferences.confirm_help")}
                </p>
                <Button
                  className="mt-6 bg-zim-gold text-slate-950 hover:bg-yellow-300"
                  onClick={submit}
                  disabled={busy}
                >
                  {busy
                    ? t("newsletter_preferences.updating")
                    : action === "unsubscribe"
                      ? t("newsletter_preferences.unsubscribe")
                      : t("newsletter_preferences.confirm")}
                </Button>
              </>
            )}
            {error && (
              <p role="alert" className="mt-5 text-rose-200">
                {error}
              </p>
            )}
            <Link
              href="/"
              className="mt-8 inline-flex min-h-11 items-center text-sm text-zim-gold underline"
            >
              {t("newsletter_preferences.return_home")}
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
