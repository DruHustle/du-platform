import { validateQuery } from "../../../shared/validators";
import { investmentQuerySchema } from "../dto/investment.dto";
export const validateInvestmentQuery = validateQuery(investmentQuerySchema);
