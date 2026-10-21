import { useEffect, useState } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { api, getApiErrorMessage } from "@/lib/api";

export default function NewsletterPreferencesPage() {
  const [input] = useState(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    return {
      token: params.get("token") || "",
      action: params.get("action") || "",
    };
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const valid =
    /^[a-f0-9]{48}$/.test(input.token) &&
    ["confirm", "unsubscribe"].includes(input.action);
  // Preference tokens stay out of server access logs, referrers and browser history.
  useEffect(() => {
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search
    );
  }, []);
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`/newsletter/${input.action}`, {
        token: input.token,
      });
      setDone(data.message);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Unable to update your newsletter preferences. Please try again."
        )
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Layout>
      <section className="document-section min-h-[65vh]">
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-6 sm:p-10 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-zim-gold">
            Diaspora Unlocked newsletter
          </p>
          <h1 className="mt-4 text-3xl font-semibold">
            {input.action === "unsubscribe"
              ? "Manage your subscription"
              : "Confirm your subscription"}
          </h1>
          {done ? (
            <p role="status" className="mt-6 leading-7 text-emerald-200">
              {done}
            </p>
          ) : !valid ? (
            <p role="alert" className="mt-6 leading-7 text-slate-300">
              Open the link in your newsletter email to confirm or unsubscribe.
              To request a new confirmation link, subscribe using the newsletter
              form below.
            </p>
          ) : (
            <>
              <p className="mt-6 leading-7 text-slate-300">
                {input.action === "unsubscribe"
                  ? "Select unsubscribe to stop receiving Diaspora Unlocked newsletters. You can subscribe again using the newsletter form."
                  : "Confirm that you want to receive news and opportunities from Diaspora Unlocked. You can unsubscribe at any time."}
              </p>
              <Button
                className="mt-6 bg-zim-gold text-slate-950 hover:bg-yellow-300"
                onClick={submit}
                disabled={busy}
              >
                {busy
                  ? "Updating…"
                  : input.action === "unsubscribe"
                    ? "Unsubscribe"
                    : "Confirm subscription"}
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
            Return home
          </Link>
        </div>
      </section>
    </Layout>
  );
}
