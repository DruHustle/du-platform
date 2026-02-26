export type FxQuote = {
  quoteId?: string;
  fxRate?: number;
  exchangeRate?: number;
  fee?: number;
  receivingAmount?: number;
};

export type RemittanceDraft = {
  amountSent: number;
  amountReceive: number;
  currencyFrom: string;
  currencyTo: string;
};
