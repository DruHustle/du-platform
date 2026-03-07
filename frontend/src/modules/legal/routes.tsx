import { createLazyRoute } from "../core/routing";

export const legalRoutes = [
  createLazyRoute("/regulations", () => import("./pages/RegulationsPage"), { prefetchOnIdle: true }),
  createLazyRoute("/cookie-settings", () => import("./pages/CookieSettingsPage")),
  createLazyRoute("/privacy-policy", () => import("./pages/PrivacyPolicyPage")),
  createLazyRoute("/terms-of-service", () => import("./pages/TermsOfServicePage")),
];
