import { validateQuery } from "../../../shared/validators";
import { tradeQuerySchema } from "../dto/trade.dto";
export const validateTradeQuery = validateQuery(tradeQuerySchema);
