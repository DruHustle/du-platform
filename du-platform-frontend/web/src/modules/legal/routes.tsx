import { createLazyRoute } from "../core/routing";

export const legalRoutes = [
  createLazyRoute("/legal-notice", () => import("./pages/PilotPoliciesPage")),
  createLazyRoute(
    "/delivery-and-returns",
    () => import("./pages/PilotPoliciesPage")
  ),
  createLazyRoute(
    "/newsletter",
    () => import("./pages/NewsletterPreferencesPage")
  ),
  createLazyRoute("/regulations", () => import("./pages/RegulationsPage")),
  createLazyRoute(
    "/cookie-settings",
    () => import("./pages/CookieSettingsPage")
  ),
  createLazyRoute("/privacy-policy", () => import("./pages/PrivacyPolicyPage")),
  createLazyRoute(
    "/terms-of-service",
    () => import("./pages/TermsOfServicePage")
  ),
];
