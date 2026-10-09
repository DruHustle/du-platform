import { createStaticRoute } from "../core/routing";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Auth pages are statically imported so they render immediately on direct navigation/refresh.
export const authRoutes = [
  createStaticRoute("/login", LoginPage),
  createStaticRoute("/register", RegisterPage),
  createStaticRoute("/forgot-password", ForgotPasswordPage),
  createStaticRoute("/reset-password", ResetPasswordPage),
];
