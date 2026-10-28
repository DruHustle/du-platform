import { listShopProducts } from "../../../lib/persistence/shopStore";

export class ProductRepository {
  async list(category?: string) {
    return listShopProducts(category);
  }
}
