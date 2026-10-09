import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToHash from "./components/ScrollToHash";
import CookieConsent from "./components/CookieConsent";
import ComingSoon from "./components/ComingSoon";
import NotFoundPage from "@/modules/core/pages/NotFoundPage";
import OnesaFloatingAssistant from "@/modules/ai/components/OnesaFloatingAssistant";
import { appRoutes } from "@/modules/routes";
import { loadPreferredAppLanguage } from "@/i18n";
import { Route, Switch } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next"; // Ensure this is imported
import { ThemeProvider } from "./contexts/ThemeContext";

const shouldEnableVercelAnalytics =
  import.meta.env.PROD && String(import.meta.env.VITE_ENABLE_VERCEL_ANALYTICS ?? "").toLowerCase() === "true";
const VercelAnalytics = shouldEnableVercelAnalytics
  ? lazy(() => import("@vercel/analytics/react").then((module) => ({ default: module.Analytics })))
  : null;

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
  };
};

function shouldPrefetchRouteChunks() {
  if (typeof window === "undefined") return false;

  const connection = (window.navigator as NavigatorWithConnection).connection;
  if (connection?.saveData) return false;
  if (connection?.effectiveType && ["slow-2g", "2g"].includes(connection.effectiveType)) {
    return false;
  }

  return true;
}

// Prefetch a small set of frequently visited lazy routes when the browser is idle
// and the network is not in data-saver or low-bandwidth mode. Keep immersive VR/AR
// routes out of this eager list so they stay truly route-lazy.
function usePrefetchRouteChunks() {
  useEffect(() => {
    if (!shouldPrefetchRouteChunks()) return;

    const startPrefetch = () => {
      void import("./modules/investment/pages/InvestmentOpportunitiesPage");
      void import("./modules/investment/pages/ProjectDetailsPage");
      void import("./modules/investment/pages/NTIRSearchPage");
      void import("./modules/shop/pages/ShopProductsPage");
      void import("./modules/ai/pages/ChatPage");
      void import("./modules/ai/pages/BookTripPage");
      void import("./modules/admin/pages/AdminDashboardPage");
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(startPrefetch, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const rafId = requestAnimationFrame(startPrefetch);
    return () => cancelAnimationFrame(rafId);
  }, []);
}

function Router() {
  const { t } = useTranslation();
  usePrefetchRouteChunks();

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
        <ComingSoon featureName="Chat With Onesa">
          <div className="text-white">
            {t('tourism.onesa.chat')}
          </div>
        </ComingSoon>
      </Route>
      <Route component={NotFoundPage} />

    </Switch>
    </>
  );
}

function App() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const beginPreferredLanguageLoad = () => {
      void loadPreferredAppLanguage();
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(beginPreferredLanguageLoad, { timeout: 1200 });
      return () => {
        window.cancelIdleCallback(idleId);
      };
    }

    const timerId = window.setTimeout(beginPreferredLanguageLoad, 180);
    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <CookieConsent />
          <Router />
          <OnesaFloatingAssistant />
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
