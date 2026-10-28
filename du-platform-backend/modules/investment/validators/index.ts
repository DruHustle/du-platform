import { validateQuery } from "../../../lib/validators";
import { investmentQuerySchema } from "../dto/investment.dto";
export const validateInvestmentQuery = validateQuery(investmentQuerySchema);
