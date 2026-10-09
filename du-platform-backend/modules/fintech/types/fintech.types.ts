export type PayoutType = 'mobile_money' | 'cash_pickup' | 'bank_transfer';

export type RemittanceRequest = {
  recipientName: string;
  recipientType: PayoutType;
  provider?: string;
  payoutChannel?: string;
  amountSent: number;
  currencyFrom: string;
  currencyTo: string;
  receivingCountry: string;
  recipient: {
    mobileNumber?: string;
    cashPickupLocation?: string;
    bankName?: string;
    bankAccountNumber?: string;
  };
  idempotencyKey?: string;
};

export type AirtimeRequest = {
  phoneNumber: string;
  amount: number;
  currency?: string;
  idempotencyKey?: string;
};
