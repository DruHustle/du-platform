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
import SearchResults from "./pages/SearchResults";
import ComingSoon from "./components/ComingSoon";
import ScrollToHash from "./components/ScrollToHash";
import Login from "./pages/LogIn";
import Register from "./pages/Register";

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
      <Route path="/data-visualization" component={DataVisualization} />
      <Route path="/success-stories" component={SuccessStories} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} /> {/* Fixed typo: registar -> register */}
      <Route path="/search" component={SearchResults} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />

      {/* COMING SOON ROUTE  */}
      <Route path="/coming-soon">
        <ComingSoon featureName="Chat With Onesa">
          <div className="text-white">
            {t('tourism.onesa.chat')}
          </div>
        </ComingSoon>
      </Route>

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
          <Router />
          <Analytics />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;