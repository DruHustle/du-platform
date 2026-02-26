import { validateQuery } from "../../../shared/validators";
import { adminQuerySchema } from "../dto/admin.dto";
export const validateAdminQuery = validateQuery(adminQuerySchema);
