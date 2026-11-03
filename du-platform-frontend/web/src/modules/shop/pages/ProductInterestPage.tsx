import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
export default function ProductInterestPage() {
  const { t } = useTranslation();
  const [input, setInput] = useState(() =>
    Object.fromEntries(new URLSearchParams(window.location.hash.slice(1)))
  );
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  const version = useRef(0);
  useEffect(() => {
    const strip = () =>
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search
      );
    const read = () => {
      version.current++;
      setInput(
        Object.fromEntries(new URLSearchParams(window.location.hash.slice(1)))
      );
      setDone(false);
      setError("");
      setBusy(false);
      strip();
    };
    strip();
    window.addEventListener("hashchange", read);
    return () => {
      version.current++;
      window.removeEventListener("hashchange", read);
    };
  }, []);
  const valid =
    /^[a-f0-9]{48}$/.test(input.token || "") &&
    ["confirm", "cancel"].includes(input.action);
  async function submit() {
    if (busy) return;
    const requestVersion = version.current;
    setBusy(true);
    setError("");
    try {
      await api.post(`/shop/interest/${input.action}`, { token: input.token });
      if (requestVersion === version.current) setDone(true);
    } catch (err: any) {
      if (requestVersion === version.current)
        setError(
          t(
            err?.response?.status === 400
              ? "product_interest.invalid_link"
              : "product_interest.error"
          )
        );
    } finally {
      if (requestVersion === version.current) setBusy(false);
    }
  }
  return (
    <Layout>
      <section className="document-section min-h-[65vh]">
        <div className="container status-page-shell">
          <div className="content-panel editorial-panel space-y-6 text-white">
            <h1 className="page-title">{t("product_interest.title")}</h1>
            <p>{t("product_interest.scope")}</p>
            {done ? (
              <p role="status" className="text-emerald-200">
                {t(
                  input.action === "confirm"
                    ? "product_interest.confirmed"
                    : "product_interest.cancelled"
                )}
              </p>
            ) : !valid ? (
              <p role="alert">{t("product_interest.invalid_link")}</p>
            ) : (
              <Button
                onClick={submit}
                disabled={busy}
                className="min-h-11 whitespace-normal bg-zim-gold text-black"
              >
                {t(
                  busy
                    ? "product_interest.updating"
                    : input.action === "confirm"
                      ? "product_interest.confirm"
                      : "product_interest.cancel"
                )}
              </Button>
            )}
            {error && (
              <p role="alert" className="text-rose-200">
                {error}
              </p>
            )}
            <Link
              href="/shop/products"
              className="inline-flex min-h-11 items-center text-zim-gold underline"
            >
              {t("pilot.browse_products")}
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
