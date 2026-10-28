import { validateQuery } from "../../../lib/validators";
import { tourismQuerySchema } from "../dto/tourism.dto";
export const validateTourismQuery = validateQuery(tourismQuerySchema);
