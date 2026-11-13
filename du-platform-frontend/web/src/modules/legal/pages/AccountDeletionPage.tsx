import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type AuthUser } from "@/lib/api";
import { resolveCurrentUserBootstrap } from "@/lib/authSessionBootstrap";
import { authPageLink } from "@/lib/safeRedirect";

export default function AccountDeletionPage() {
  const { t } = useTranslation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let current = true;
    setBusy(true);
    setError("");
    void resolveCurrentUserBootstrap({ force: true })
      .then(
        user => {
          if (current) setUser(user);
        },
        () => {
          if (current) setError("deletion.retry");
        }
      )
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [refresh]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !user || !password) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/deletion-request", {
        accountId: user.id,
        password,
        confirm: true,
      });
      if (data?.status !== "requested" || !data.requestId) throw new Error();
      setReference(data.requestId);
      setPassword("");
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response
        ?.status;
      if (status === 401 || status === 409) {
        setPassword("");
        setUser(null);
      }
      setError(
        status === 403
          ? "deletion.password_error"
          : status === 401 || status === 409
            ? "deletion.sign_in"
            : "deletion.retry"
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Layout>
      <section className="document-section min-h-screen bg-slate-950 text-white">
        <div className="container mx-auto max-w-xl space-y-5">
          <h1 className="page-title">{t("deletion.title")}</h1>
          <p>{t("deletion.details")}</p>
          {reference ? (
            <p role="status">{t("deletion.receipt", { reference })}</p>
          ) : user ? (
            <form onSubmit={submit} className="space-y-4">
              <p>{user.email}</p>
              <label className="block">
                {t("deletion.password")}
                <Input
                  className="min-h-11"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </label>
              <Button disabled={busy || !password}>
                {t("deletion.confirm")}
              </Button>
            </form>
          ) : busy ? (
            <p role="status">{t("deletion.loading")}</p>
          ) : (
            <Link
              className="inline-flex min-h-11 items-center text-zim-gold underline"
              href={authPageLink("/login", "/account-deletion")}
            >
              {t("deletion.sign_in")}
            </Link>
          )}
          {error && <p role="alert">{t(error)}</p>}
          {!busy && !user && error === "deletion.retry" && (
            <Button onClick={() => setRefresh(value => value + 1)}>
              {t("deletion.again")}
            </Button>
          )}
          <a
            href="/privacy-policy"
            className="inline-flex min-h-11 items-center underline"
          >
            {t("legal.privacy.title")}
          </a>
        </div>
      </section>
    </Layout>
  );
}
