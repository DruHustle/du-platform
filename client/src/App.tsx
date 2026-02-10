import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ExportHub from "./pages/ExportHub";
import Tourism from "./pages/Tourism";
import Investment from "./pages/Investment";
import Trade from "./pages/Trade";
import DataVisualization from "./pages/DataVisualization";
import SuccessStories from "./pages/SuccessStories";
import { Analytics } from "@vercel/analytics/react";



function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/export-hub"} component={ExportHub} />
      <Route path={"/tourism"} component={Tourism} />
      <Route path={"/investment"} component={Investment} />
      <Route path={"/trade"} component={Trade} />
      <Route path={"/data-visualization"} component={DataVisualization} />
      <Route path={"/success-stories"} component={SuccessStories} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
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
