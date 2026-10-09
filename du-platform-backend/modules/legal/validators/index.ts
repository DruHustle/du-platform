import { validateQuery } from "../../../shared/validators";
import { legalQuerySchema } from "../dto/legal.dto";
export const validateLegalQuery = validateQuery(legalQuerySchema);
