import { lazy, useEffect, type ComponentType, type ReactElement } from "react";
import i18n from "@/i18n";
import { useLocation } from "wouter";

export type AppRouteDefinition = {
  path: string;
  render: () => ReactElement;
};

export function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white/70">
      <p role="status" aria-live="polite" className="text-sm">
        {i18n.t("routing.loading_page_content", {
          defaultValue: "Loading page content",
        })}
      </p>
    </div>
  );
}

export function createStaticRoute(path: string, Component: ComponentType) {
  return {
    path,
    render: () => <Component />,
  } satisfies AppRouteDefinition;
}

/**
 * Creates a route whose page component is code-split and lazy-loaded on first navigation.
 * The factory must be a dynamic import: () => import("./pages/MyPage")
 * The imported module must have a default export that is a React component.
 */
export function createLazyRoute(
  path: string,
  factory: () => Promise<{ default: ComponentType }>
) {
  const LazyComponent = lazy(factory);
  return {
    path,
    render: () => <LazyComponent />,
  } satisfies AppRouteDefinition;
}

function RedirectRoute({ to }: { to: string }) {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const suffix =
      typeof window === "undefined"
        ? ""
        : `${window.location.search ?? ""}${window.location.hash ?? ""}`;
    const target = `${to}${suffix}`;
    if (location === target) return;
    setLocation(target, { replace: true });
  }, [location, setLocation, to]);

  return <RouteFallback />;
}

export function createRedirectRoute(path: string, to: string) {
  return {
    path,
    render: () => <RedirectRoute to={to} />,
  } satisfies AppRouteDefinition;
}
