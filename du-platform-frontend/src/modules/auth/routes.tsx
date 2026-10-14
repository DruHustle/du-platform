import { createLazyRoute } from "../core/routing";

export const authRoutes = [
  createLazyRoute("/login", () => import("./pages/LoginPage")),
  createLazyRoute("/register", () => import("./pages/RegisterPage")),
  createLazyRoute(
    "/forgot-password",
    () => import("./pages/ForgotPasswordPage")
  ),
  createLazyRoute("/reset-password", () => import("./pages/ResetPasswordPage")),
];
