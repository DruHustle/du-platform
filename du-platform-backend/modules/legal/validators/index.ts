import { validateQuery } from "../../../lib/validators";
import { legalQuerySchema } from "../dto/legal.dto";
export const validateLegalQuery = validateQuery(legalQuerySchema);
