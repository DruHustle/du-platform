import { validateBody } from '../../../shared/validators';
import { loginSchema, registerSchema } from '../dto/auth.dto';

export const validateLogin = validateBody(loginSchema);
export const validateRegister = validateBody(registerSchema);
