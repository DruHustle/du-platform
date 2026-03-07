import { useEffect, type ComponentType, type ReactElement } from "react";
import { useLocation } from "wouter";

export type AppRouteDefinition = {
  path: string;
  render: () => ReactElement;
};

export function RouteFallback() {
  return (
    <div className="min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_48%,#f8fafc_100%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zim-green text-white shadow-[0_18px_42px_-24px_rgba(15,23,42,0.8)]">
              <span className="text-sm font-black tracking-[0.22em]">DU</span>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-slate-500">Diaspora Unlocked</p>
              <div className="h-3 w-40 animate-pulse rounded-full bg-slate-900/10" />
            </div>
          </div>
          <div className="hidden h-10 w-28 animate-pulse rounded-full bg-white/80 shadow-sm sm:block" />
        </div>

        <div className="my-auto grid gap-8 py-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-center">
          <div className="space-y-5">
            <div className="w-fit rounded-full border border-zim-green/15 bg-white/85 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-zim-green shadow-sm">
              Loading Page
            </div>
            <div className="space-y-4">
              <div className="h-5 w-36 animate-pulse rounded-full bg-zim-gold/40" />
              <div className="h-14 w-full max-w-2xl animate-pulse rounded-[2rem] bg-slate-950/12" />
              <div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-slate-950/10" />
              <div className="h-4 w-5/6 max-w-lg animate-pulse rounded-full bg-slate-950/8" />
            </div>
            <div className="flex gap-3 pt-2">
              <div className="h-11 w-36 animate-pulse rounded-full bg-zim-green/15" />
              <div className="h-11 w-28 animate-pulse rounded-full bg-slate-900/8" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            <div className="h-52 animate-pulse rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(15,23,42,0.07),rgba(250,204,21,0.24))]" />
            <div className="mt-6 h-4 w-32 animate-pulse rounded-full bg-slate-900/10" />
            <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-slate-900/8" />
            <div className="mt-2 h-3 w-4/5 animate-pulse rounded-full bg-slate-900/7" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="h-20 animate-pulse rounded-[1.5rem] bg-slate-900/7" />
              <div className="h-20 animate-pulse rounded-[1.5rem] bg-slate-900/6" />
            </div>
          </div>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          Loading page content
        </p>
      </div>
    </div>
  );
}

export function createStaticRoute(path: string, Component: ComponentType) {
  return {
    path,
    render: () => <Component />,
  } satisfies AppRouteDefinition;
}

function RedirectRoute({ to }: { to: string }) {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const suffix =
      typeof window === "undefined" ? "" : `${window.location.search ?? ""}${window.location.hash ?? ""}`;
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
