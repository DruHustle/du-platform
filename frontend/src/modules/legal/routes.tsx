import CookieSettingsPage from "./pages/CookieSettingsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import RegulationsPage from "./pages/RegulationsPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import { createStaticRoute } from "../core/routing";

export const legalRoutes = [
  createStaticRoute("/regulations", RegulationsPage),
  createStaticRoute("/cookie-settings", CookieSettingsPage),
  createStaticRoute("/privacy-policy", PrivacyPolicyPage),
  createStaticRoute("/terms-of-service", TermsOfServicePage),
];
