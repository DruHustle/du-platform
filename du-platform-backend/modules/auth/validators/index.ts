import { validateBody } from "../../../shared/validators";
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from "../dto/auth.dto";

export const validateLogin = validateBody(loginSchema);
export const validateProfile = validateBody(profileSchema);
export const validateRegister = validateBody(registerSchema);
export const validateForgotPassword = validateBody(forgotPasswordSchema);
export const validateResetPassword = validateBody(resetPasswordSchema);
