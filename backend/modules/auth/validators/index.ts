import { validateBody } from '../../../shared/validators';
import {
  forgotPasswordSchema,
  kycDecisionSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../dto/auth.dto';

export const validateLogin = validateBody(loginSchema);
export const validateRegister = validateBody(registerSchema);
export const validateForgotPassword = validateBody(forgotPasswordSchema);
export const validateResetPassword = validateBody(resetPasswordSchema);
export const validateKycDecision = validateBody(kycDecisionSchema);
