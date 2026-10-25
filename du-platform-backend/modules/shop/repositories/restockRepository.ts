import { ProductInterestService } from "../interestService";

export class RestockRepository {
  create(payload: {
    language?: string;
    productId?: number | null;
    productSlug: string;
    productName: string;
    email: string;
  }) {
    return new ProductInterestService().register(payload);
  }
}
