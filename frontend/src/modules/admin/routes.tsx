import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { type AuthUser } from "@/lib/api";
import { resolveCurrentUserBootstrap } from "@/lib/authSessionBootstrap";
import { RouteFallback } from "../core/routing";
import type { AppRouteDefinition } from "../core/routing";

const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));

function AdminGuard() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    void resolveCurrentUserBootstrap({ force: true }).then((resolvedUser) => {
      if (cancelled) return;
      if (!resolvedUser) {
        setStatus("denied");
        setLocation(`/login?next=${encodeURIComponent("/admin")}`, { replace: true });
        return;
      }

      setUser(resolvedUser);
      setStatus("allowed");
    });

    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  if (status === "checking") {
    return <RouteFallback />;
  }

  if (status !== "allowed" || !user) return null;

  return (
    <Suspense fallback={<RouteFallback />}>
      <AdminDashboardPage />
    </Suspense>
  );
}

export const adminRoutes: AppRouteDefinition[] = [
  { path: "/admin", render: () => <AdminGuard /> },
];
