import { lazy, Suspense, type ComponentType, type ReactElement } from "react";

export type AppRouteDefinition = {
  path: string;
  render: () => ReactElement;
  preload?: () => Promise<unknown>;
  prefetchOnIdle?: boolean;
};

export function RouteFallback() {
  return <div className="min-h-screen w-full" aria-hidden />;
}

export function shouldPrefetchRoutesOnIdle() {
  if (typeof window === "undefined") return false;
  if (document.visibilityState === "hidden") return false;

  const navigatorWithHints = navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
    deviceMemory?: number;
  };

  const connection = navigatorWithHints.connection;
  if (connection?.saveData) return false;
  if (typeof connection?.effectiveType === "string" && /(^|-)2g$/i.test(connection.effectiveType)) {
    return false;
  }

  if (typeof navigatorWithHints.deviceMemory === "number" && navigatorWithHints.deviceMemory <= 2) {
    return false;
  }

  if (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 2) {
    return false;
  }

  return true;
}

export function createStaticRoute(path: string, Component: ComponentType) {
  return {
    path,
    render: () => <Component />,
  } satisfies AppRouteDefinition;
}

export function createLazyRoute(
  path: string,
  loader: () => Promise<{ default: ComponentType }>,
  options?: { prefetchOnIdle?: boolean }
) {
  const Component = lazy(loader);

  return {
    path,
    preload: loader,
    prefetchOnIdle: options?.prefetchOnIdle ?? false,
    render: () => (
      <Suspense fallback={<RouteFallback />}>
        <Component />
      </Suspense>
    ),
  } satisfies AppRouteDefinition;
}
