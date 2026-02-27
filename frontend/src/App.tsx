import { Analytics } from "@vercel/analytics/react"; 
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { useTranslation } from "react-i18next"; // Ensure this is imported
import Home from "./pages/Home";
import Tourism from "./pages/Tourism";
import Investment from "./pages/Investment";
import Trade from "./pages/Trade";
import DataVisualization from "./pages/DataVisualization";
import Impact from "./pages/Impact";
import Technology from "./pages/Technology";
import Shop from "./pages/Shop";
import ShopProducts from "./pages/ShopProducts";
import SearchResults from "./pages/SearchResults";
import LogIn from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import NtirDatabase from "./pages/NtirDatabase";
import ProjectDetails from "./pages/ProjectDetails";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ResetPassword from "./pages/ResetPassword";
import Regulations from "./pages/Regulations";
import OnesaAIChat from "./pages/OnesaAIChat";
import OnesaAIBookTrip from "./pages/OnesaAIBookTrip";
import OnesaAITourismVirtualExperience from "./pages/OnesaAITourismVirtualExperience";
import OnesaAITourismAugmentedExperience from "./pages/OnesaAITourismAugmentedExperience";
import AdminDashboard from "./pages/AdminDashboard";
import CookieSettings from "./pages/CookieSettings";
import Payments from "./pages/Payments";
import NotFound from "@/pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ComingSoon from "./components/ComingSoon";
import ScrollToHash from "./components/ScrollToHash";
import CookieConsent from "./components/CookieConsent";

function Router() {
  const { t } = useTranslation();

  return (
    <>
    <ScrollToHash />
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tourism" component={Tourism} />
      <Route path="/investment" component={Investment} />
      <Route path="/trade" component={Trade} />
      <Route path="/technology" component={Technology} />
      <Route path="/shop" component={Shop} />
      <Route path="/shop/products" component={ShopProducts} />
      <Route path="/data-visualization" component={DataVisualization} />
      <Route path="/impact" component={Impact} />
      <Route path="/payments" component={Payments} />
      <Route path="/login" component={LogIn} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/regulations" component={Regulations} />
      <Route path="/onesa-ai-chat" component={OnesaAIChat} />
      <Route path="/onesa-ai-book-trip" component={OnesaAIBookTrip} />
      <Route path="/onesa-ai-tourism-virtual-experince" component={OnesaAITourismVirtualExperience} />
      <Route path="/onesa-ai-tourism-augmented-experince" component={OnesaAITourismAugmentedExperience} />
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
