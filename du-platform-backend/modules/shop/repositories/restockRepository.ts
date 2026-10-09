import { createShopRestockNotification } from "../../../shared/persistence/shopStore";

export class RestockRepository {
  create(payload: {
    productId?: number | null;
    productSlug: string;
    productName: string;
    email: string;
  }) {
    return createShopRestockNotification(payload);
  }
}
