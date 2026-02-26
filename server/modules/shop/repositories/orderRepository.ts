import { createShopOrder, getShopOrderByRef } from '../../../db';

export class OrderRepository {
  create(payload: Parameters<typeof createShopOrder>[0]) {
    return createShopOrder(payload);
  }

  findByRef(orderRef: string) {
    return getShopOrderByRef(orderRef);
  }
}
