export type FinancialFeature =
  | "remittance"
  | "airtime"
  | "school_fee_payments"
  | "tourism_booking_deposits"
  | "sme_invoice_payments";

export interface FinancialProvider {
  readonly providerName: string;
  supports(feature: FinancialFeature): boolean;
}
