import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { createStaticRoute } from "../core/routing";

export const authRoutes = [
  createStaticRoute("/login", LoginPage),
  createStaticRoute("/register", RegisterPage),
  createStaticRoute("/forgot-password", ForgotPasswordPage),
  createStaticRoute("/reset-password", ResetPasswordPage),
];
