import { listShopProducts } from '../../../db';

export class ProductRepository {
  async list(category?: string) {
    return listShopProducts(category);
  }
}
