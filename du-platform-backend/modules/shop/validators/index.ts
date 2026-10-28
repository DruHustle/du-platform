import { validateBody, validateQuery } from '../../../lib/validators';
import {
  createOrderSchema,
  listProductsQuerySchema,
  restockNotificationSchema,
} from '../dto/shop.dto';

export const validateProductQuery = validateQuery(listProductsQuerySchema);
export const validateCreateOrder = validateBody(createOrderSchema);
export const validateRestockNotification = validateBody(restockNotificationSchema);
