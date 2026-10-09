import { createStaticRoute } from "../core/routing";
import RegulationsPage from "./pages/RegulationsPage";
import CookieSettingsPage from "./pages/CookieSettingsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";

export const legalRoutes = [
  createStaticRoute("/regulations", RegulationsPage),
  createStaticRoute("/cookie-settings", CookieSettingsPage),
  createStaticRoute("/privacy-policy", PrivacyPolicyPage),
  createStaticRoute("/terms-of-service", TermsOfServicePage),
];
