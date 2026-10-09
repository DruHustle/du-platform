import { validateQuery } from "../../../shared/validators";
import { searchQuerySchema } from "../dto/search.dto";
export const validateSearchQuery = validateQuery(searchQuerySchema);
