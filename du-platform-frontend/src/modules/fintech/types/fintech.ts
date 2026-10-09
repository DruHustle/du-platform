export type FxQuote = {
  quoteId?: string;
  quoteExpiryTime?: string;
  quoteToken?: string;
  fxRate?: number;
  fee?: number;
  senderFee?: number;
  receivingAmount?: number;
  receivingCurrency?: string;
  sendingAmount?: number;
  sendingCurrency?: string;
};

export type RemittanceDraft = {
  amountSent: number;
  amountReceive: number;
  currencyFrom: string;
  currencyTo: string;
};
