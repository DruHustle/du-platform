import { createShopOrder, getShopOrderByRef } from "../../../shared/persistence/shopStore";

export class OrderRepository {
  create(payload: Parameters<typeof createShopOrder>[0]) {
    return createShopOrder(payload);
  }

  findByRef(orderRef: string, manageToken: string) {
    return getShopOrderByRef(orderRef, manageToken);
  }
}
