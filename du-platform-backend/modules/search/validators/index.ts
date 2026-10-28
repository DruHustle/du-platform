import { validateQuery } from "../../../lib/validators";
import { searchQuerySchema } from "../dto/search.dto";
export const validateSearchQuery = validateQuery(searchQuerySchema);
