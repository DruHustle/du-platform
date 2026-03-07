import { createLazyRoute } from "../core/routing";

export const authRoutes = [
  createLazyRoute("/login", () => import("./pages/LoginPage"), { prefetchOnIdle: true }),
  createLazyRoute("/register", () => import("./pages/RegisterPage"), { prefetchOnIdle: true }),
  createLazyRoute("/forgot-password", () => import("./pages/ForgotPasswordPage"), { prefetchOnIdle: true }),
  createLazyRoute("/reset-password", () => import("./pages/ResetPasswordPage"), { prefetchOnIdle: true }),
];
