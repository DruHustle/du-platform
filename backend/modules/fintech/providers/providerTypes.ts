export type FinancialFeature =
  | "remittance"
  | "airtime"
  | "gift_cards"
  | "school_fee_payments"
  | "tourism_booking_deposits"
  | "sme_invoice_payments";

export interface FinancialProvider {
  readonly providerName: string;
  readonly displayName: string;
  supports(feature: FinancialFeature): boolean;
}

export type NormalizedRemittanceQuote = {
  quoteId?: string;
  fxRate?: number | null;
  sendingAmount?: number | null;
  receivingAmount?: number | null;
  sendingCurrency?: string;
  receivingCurrency?: string;
  senderFee?: number | null;
  [key: string]: unknown;
};

export type NormalizedRemittanceRequest = {
  idempotencyKey?: string;
  recipientName?: string;
  recipientType?: string;
  provider?: string;
  payoutChannel?: string;
  amountSent?: number;
  currencyFrom?: string;
  currencyTo?: string;
  originCountry?: string;
  senderMsisdn?: string;
  receivingCountry?: string;
  recipient?: {
    mobileNumber?: string;
    cashPickupLocation?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankCode?: string;
  };
  [key: string]: unknown;
};

export type ProviderTransactionLike = {
  transactionId?: string;
  transaction_id?: string;
  reference?: string;
  transactionStatus?: string;
  status?: string;
  [key: string]: unknown;
};

export type AirtimeOperatorLike = {
  operatorId?: number | string;
  id?: number | string;
  name?: string;
  [key: string]: unknown;
};

export type AirtimeTopupLike = {
  transactionId?: string;
  reference?: string;
  status?: string;
  [key: string]: unknown;
};

export type AirtimeRequestLike = {
  phoneNumber?: string;
  amount?: number;
  currency?: string;
  idempotencyKey?: string;
  [key: string]: unknown;
};

export type RemittanceProviderQuoteResult = {
  idempotencyKey: string;
  quote: NormalizedRemittanceQuote;
  fxQuote: NormalizedRemittanceQuote;
  normalizedRequest: NormalizedRemittanceRequest;
};

export type RemittanceProviderSendResult = {
  idempotencyKey: string;
  request: NormalizedRemittanceRequest;
  quote: NormalizedRemittanceQuote;
  transaction: ProviderTransactionLike;
  transfer: ProviderTransactionLike;
};

export type AirtimeProviderTopupResult = {
  request: AirtimeRequestLike;
  normalizedPhone: string;
  operator: AirtimeOperatorLike;
  topup: AirtimeTopupLike;
  reference: string;
};

export interface RemittanceFeatureProvider extends FinancialProvider {
  previewQuote(input: unknown): Promise<RemittanceProviderQuoteResult>;
  sendMoney(
    input: unknown,
    senderProfile?: {
      full_name?: string;
      email?: string;
    } | null
  ): Promise<RemittanceProviderSendResult>;
}

export interface AirtimeFeatureProvider extends FinancialProvider {
  detectOperator(phoneNumber: string): Promise<AirtimeOperatorLike>;
  fetchTopupOptions(phoneNumber: string, amount?: number): Promise<Record<string, unknown>>;
  createTopup(input: unknown): Promise<AirtimeProviderTopupResult>;
}
