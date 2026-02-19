import { Analytics } from "@vercel/analytics/react"; 
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { useTranslation } from "react-i18next"; // Ensure this is imported
import NotFound from "@/pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ExportHub from "./pages/ExportHub";
import Tourism from "./pages/Tourism";
import Investment from "./pages/Investment";
import Trade from "./pages/Trade";
import DataVisualization from "./pages/DataVisualization";
import SuccessStories from "./pages/SuccessStories";
import Technology from "./pages/Technology";
import Shop from "./pages/Shop";
import ShopProducts from "./pages/ShopProducts";
import SearchResults from "./pages/SearchResults";
import ComingSoon from "./components/ComingSoon";
import ScrollToHash from "./components/ScrollToHash";
import LogIn from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import NtirDatabase from "./pages/NtirDatabase";
import ProjectDetails from "./pages/ProjectDetails";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ResetPassword from "./pages/ResetPassword";
import Regulations from "./pages/Regulations";
import OnesaAI from "./pages/OnesaAI";
import AdminDashboard from "./pages/AdminDashboard";
import CookieConsent from "./components/CookieConsent";
import CookieSettings from "./pages/CookieSettings";

function Router() {
  const { t } = useTranslation();

  return (
    <>
    <ScrollToHash />
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/export-hub" component={ExportHub} />
      <Route path="/tourism" component={Tourism} />
      <Route path="/investment" component={Investment} />
      <Route path="/trade" component={Trade} />
      <Route path="/technology" component={Technology} />
      <Route path="/shop" component={Shop} />
      <Route path="/shop/products" component={ShopProducts} />
      <Route path="/data-visualization" component={DataVisualization} />
      <Route path="/success-stories" component={SuccessStories} />
      <Route path="/login" component={LogIn} />
      <Route path="/register" component={Register} /> {/* Fixed typo: registar -> register */}
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/regulations" component={Regulations} />
      <Route path="/onesa-ai" component={OnesaAI} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/cookie-settings" component={CookieSettings} />
      <Route path="/ntir" component={NtirDatabase} />
      <Route path="/investment/projects/:id" component={ProjectDetails} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/search" component={SearchResults} />
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
