import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToHash from "./components/ScrollToHash";
import CookieConsent from "./components/CookieConsent";
import NotFoundPage from "@/modules/core/pages/NotFoundPage";
import { appRoutes, prefetchableRoutes } from "@/modules/routes";
import { Route, Switch } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next"; // Ensure this is imported
import { ThemeProvider } from "./contexts/ThemeContext";
import { shouldPrefetchRoutesOnIdle } from "@/modules/core/routing";

const shouldEnableVercelAnalytics =
  import.meta.env.PROD && String(import.meta.env.VITE_ENABLE_VERCEL_ANALYTICS ?? "").toLowerCase() === "true";
const ComingSoon = lazy(() => import("./components/ComingSoon"));
const VercelAnalytics = shouldEnableVercelAnalytics
  ? lazy(() => import("@vercel/analytics/react").then((module) => ({ default: module.Analytics })))
  : null;
const OnesaFloatingAssistant = lazy(() => import("@/modules/ai/components/OnesaFloatingAssistant"));

function Router() {
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof window === "undefined" || !shouldPrefetchRoutesOnIdle()) return;

    const prefetchRoutes = () => {
      for (const route of prefetchableRoutes) {
        route.preload?.();
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(prefetchRoutes, { timeout: 3000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timerId = window.setTimeout(prefetchRoutes, 1200);
    return () => window.clearTimeout(timerId);
  }, []);

  return (
    <>
    <ScrollToHash />
    <Switch>
      {appRoutes.map((route) => (
        <Route key={route.path} path={route.path}>
          {route.render()}
        </Route>
      ))}

      {/* COMING SOON ROUTE  */}
      <Route path="/coming-soon">
        <Suspense fallback={null}>
          <ComingSoon featureName="Chat With Onesa">
            <div className="text-white">
              {t('tourism.onesa.chat')}
            </div>
          </ComingSoon>
        </Suspense>
      </Route>
      <Route component={NotFoundPage} />

    </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <CookieConsent />
          <Router />
          <Suspense fallback={null}>
            <OnesaFloatingAssistant />
          </Suspense>
          {VercelAnalytics ? (
            <Suspense fallback={null}>
              <VercelAnalytics />
            </Suspense>
          ) : null}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
