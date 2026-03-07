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

function Router() {
  const { t } = useTranslation();

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
