import { confirmShopOrderPayment } from "../../../shared/persistence/shopStore";

export class PaymentRepository {
  confirm(orderRef: string, paymentReference: string, manageToken: string) {
    return confirmShopOrderPayment(orderRef, paymentReference, manageToken);
  }
}
