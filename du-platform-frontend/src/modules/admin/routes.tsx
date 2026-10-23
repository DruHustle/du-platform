import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api, type AuthUser } from "@/lib/api";
import Layout from "@/components/Layout";
import { useTranslation } from "react-i18next";
import { resolveCurrentUserBootstrap } from "@/lib/authSessionBootstrap";
import { RouteFallback } from "../core/routing";
import type { AppRouteDefinition } from "../core/routing";

const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));

function AdminGuard() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [status, setStatus] = useState<
    "checking" | "allowed" | "denied" | "error"
  >("checking");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    void resolveCurrentUserBootstrap({ force: true }).then(
      async resolvedUser => {
        if (cancelled) return;
        if (!resolvedUser) {
          setStatus("denied");
          setLocation(`/login?next=${encodeURIComponent("/admin")}`, {
            replace: true,
          });
          return;
        }

        try {
          await api.get("/admin/overview");
          if (!cancelled) {
            setUser(resolvedUser);
            setStatus("allowed");
          }
        } catch (error: any) {
          if (cancelled) return;
          if (error?.response?.status === 401)
            setLocation(`/login?next=${encodeURIComponent("/admin")}`, {
              replace: true,
            });
          setStatus(error?.response?.status === 403 ? "denied" : "error");
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  if (status === "checking") {
    return <RouteFallback />;
  }

  if (status !== "allowed" || !user)
    return (
      <Layout>
        <section className="document-section min-h-[60vh] bg-slate-950">
          <div className="container max-w-2xl space-y-4">
            <h1 className="page-title text-white">{t("admin.title")}</h1>
            <p role="alert" className="text-slate-300">
              {t(
                status === "denied"
                  ? "admin.access_denied"
                  : "admin.errors.load"
              )}
            </p>
            <a
              href="/"
              className="inline-flex min-h-11 items-center text-zim-gold"
            >
              {t("nav.home")}
            </a>
          </div>
        </section>
      </Layout>
    );

  return (
    <Suspense fallback={<RouteFallback />}>
      <AdminDashboardPage />
    </Suspense>
  );
}

export const adminRoutes: AppRouteDefinition[] = [
  { path: "/admin", render: () => <AdminGuard /> },
];
