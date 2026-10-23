import { searchNtirEntities } from "../../../shared/persistence/investmentStore";
import { listShopProducts } from "../../../shared/persistence/shopStore";

export class SearchRepository {
  searchNtir(query: string) {
    return searchNtirEntities(query);
  }
  async publishedProducts() {
    const result = await listShopProducts();
    if (result.source !== "db")
      throw new Error("Catalogue retrieval unavailable");
    return result.products;
  }
}
