import { listShopProducts } from "../../../shared/persistence/shopStore";

export class ProductRepository {
  async list(category?: string) {
    return listShopProducts(category);
  }
}
