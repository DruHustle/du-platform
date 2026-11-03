import { validateQuery } from "../../../shared/validators";
import { tourismQuerySchema } from "../dto/tourism.dto";
export const validateTourismQuery = validateQuery(tourismQuerySchema);
