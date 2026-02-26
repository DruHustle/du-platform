import { validateQuery } from "../../../shared/validators";
import { dataQuerySchema } from "../dto/data.dto";
export const validateDataQuery = validateQuery(dataQuerySchema);
