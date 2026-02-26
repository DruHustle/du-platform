import { validateBody, validateQuery } from '../../../shared/validators';
import { createOrderSchema, listProductsQuerySchema } from '../dto/shop.dto';

export const validateProductQuery = validateQuery(listProductsQuerySchema);
export const validateCreateOrder = validateBody(createOrderSchema);
