import { confirmShopOrderPayment } from '../../../db';

export class PaymentRepository {
  confirm(orderRef: string, paymentReference: string) {
    return confirmShopOrderPayment(orderRef, paymentReference);
  }
}
