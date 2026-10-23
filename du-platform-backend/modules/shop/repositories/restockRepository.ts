import { createShopRestockNotification } from "../../../shared/persistence/shopStore";

export class RestockRepository {
  create(payload: {
    language?: string;
    productId?: number | null;
    productSlug: string;
    productName: string;
    email: string;
  }) {
    return createShopRestockNotification(payload);
  }
}
