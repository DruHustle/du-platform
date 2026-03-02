import { Analytics } from "@vercel/analytics/react"; 
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next"; // Ensure this is imported
import Home from "./pages/Home";
import Tourism from "./pages/Tourism";
import Investment from "./pages/Investment";
import Trade from "./pages/Trade";
import Impact from "./pages/Impact";
import Technology from "./pages/Technology";
import Shop from "./pages/Shop";
import Payments from "./pages/Payments";
import Care from "./pages/Care";
import NotFound from "@/pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ComingSoon from "./components/ComingSoon";
import ScrollToHash from "./components/ScrollToHash";
import CookieConsent from "./components/CookieConsent";

const LazyInvestmentOpportunities = lazy(() => import("./pages/InvestmentOpportunities"));
const LazyShopProducts = lazy(() => import("./pages/ShopProducts"));
const LazySearchResults = lazy(() => import("./pages/SearchResults"));
const LazyLogin = lazy(() => import("./pages/Login"));
const LazyRegister = lazy(() => import("./pages/Register"));
const LazyForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const LazyResetPassword = lazy(() => import("./pages/ResetPassword"));
const LazyRegulations = lazy(() => import("./pages/Regulations"));
const LazyOnesaAIChat = lazy(() => import("./pages/OnesaAIChat"));
const LazyOnesaAIBookTrip = lazy(() => import("./pages/OnesaAIBookTrip"));
const LazyNtirDatabase = lazy(() => import("./pages/NtirDatabase"));
const LazyProjectDetails = lazy(() => import("./pages/ProjectDetails"));
const LazyAdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const LazyCookieSettings = lazy(() => import("./pages/CookieSettings"));
const LazyPrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const LazyTermsOfService = lazy(() => import("./pages/TermsOfService"));
const LazyOnesaAITourismVirtualExperience = lazy(() => import("./pages/OnesaAITourismVirtualExperience"));
const LazyOnesaAITourismAugmentedExperience = lazy(() => import("./pages/OnesaAITourismAugmentedExperience"));

function RouteFallback() {
  return <div className="min-h-screen w-full" aria-hidden />;
}

function OnesaVirtualExperienceRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <LazyOnesaAITourismVirtualExperience />
    </Suspense>
  );
}

function OnesaAugmentedExperienceRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <LazyOnesaAITourismAugmentedExperience />
    </Suspense>
  );
}

function Router() {
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefetchRoutes = () => {
      void import("./pages/InvestmentOpportunities");
      void import("./pages/ShopProducts");
      void import("./pages/Login");
      void import("./pages/Register");
      void import("./pages/ForgotPassword");
      void import("./pages/ResetPassword");
      void import("./pages/OnesaAIChat");
      void import("./pages/OnesaAIBookTrip");
      void import("./pages/Regulations");
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
      <Route path="/" component={Home} />
      <Route path="/tourism" component={Tourism} />
      <Route path="/investment" component={Investment} />
      <Route path="/investment/opportunities">
        <Suspense fallback={<RouteFallback />}>
          <LazyInvestmentOpportunities />
        </Suspense>
      </Route>
      <Route path="/trade" component={Trade} />
      <Route path="/technology" component={Technology} />
      <Route path="/shop" component={Shop} />
      <Route path="/shop/products">
        <Suspense fallback={<RouteFallback />}>
          <LazyShopProducts />
        </Suspense>
      </Route>
      <Route path="/impact" component={Impact} />
      <Route path="/payments" component={Payments} />
      <Route path="/care" component={Care} />
      <Route path="/login">
        <Suspense fallback={<RouteFallback />}>
          <LazyLogin />
        </Suspense>
      </Route>
      <Route path="/register">
        <Suspense fallback={<RouteFallback />}>
          <LazyRegister />
        </Suspense>
      </Route>
      <Route path="/forgot-password">
        <Suspense fallback={<RouteFallback />}>
          <LazyForgotPassword />
        </Suspense>
      </Route>
      <Route path="/reset-password">
        <Suspense fallback={<RouteFallback />}>
          <LazyResetPassword />
        </Suspense>
      </Route>
      <Route path="/regulations">
        <Suspense fallback={<RouteFallback />}>
          <LazyRegulations />
        </Suspense>
      </Route>
      <Route path="/onesa-ai-chat">
        <Suspense fallback={<RouteFallback />}>
          <LazyOnesaAIChat />
        </Suspense>
      </Route>
      <Route path="/onesa-ai-book-trip">
        <Suspense fallback={<RouteFallback />}>
          <LazyOnesaAIBookTrip />
        </Suspense>
      </Route>
      <Route path="/onesa-ai-tourism-virtual-experience" component={OnesaVirtualExperienceRoute} />
      <Route path="/onesa-ai-tourism-augmented-experience" component={OnesaAugmentedExperienceRoute} />
      {/* Backward-compatible aliases for old misspelled links */}
      <Route path="/onesa-ai-tourism-virtual-experince" component={OnesaVirtualExperienceRoute} />
      <Route path="/onesa-ai-tourism-augmented-experince" component={OnesaAugmentedExperienceRoute} />
      <Route path="/admin">
        <Suspense fallback={<RouteFallback />}>
          <LazyAdminDashboard />
        </Suspense>
      </Route>
      <Route path="/cookie-settings">
        <Suspense fallback={<RouteFallback />}>
          <LazyCookieSettings />
        </Suspense>
      </Route>
      <Route path="/ntir">
        <Suspense fallback={<RouteFallback />}>
          <LazyNtirDatabase />
        </Suspense>
      </Route>
      <Route path="/investment/projects/:id">
        <Suspense fallback={<RouteFallback />}>
          <LazyProjectDetails />
        </Suspense>
      </Route>
      <Route path="/privacy-policy">
        <Suspense fallback={<RouteFallback />}>
          <LazyPrivacyPolicy />
        </Suspense>
      </Route>
      <Route path="/terms-of-service">
        <Suspense fallback={<RouteFallback />}>
          <LazyTermsOfService />
        </Suspense>
      </Route>
      <Route path="/search">
        <Suspense fallback={<RouteFallback />}>
          <LazySearchResults />
        </Suspense>
      </Route>
      <Route path="/404" component={NotFound} />

      {/* COMING SOON ROUTE  */}
      <Route path="/coming-soon">
        <ComingSoon featureName="Chat With Onesa">
          <div className="text-white">
            {t('tourism.onesa.chat')}
          </div>
        </ComingSoon>
      </Route>
      <Route component={NotFound} />

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
          <Analytics />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
