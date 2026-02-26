export type PayoutType = 'mobile_money' | 'cash_pickup' | 'visa_card';

export type RemittanceRequest = {
  recipientName: string;
  recipientType: PayoutType;
  provider: string;
  payoutChannel?: string;
  amountSent: number;
  currencyFrom: string;
  currencyTo: string;
  receivingCountry: string;
  recipient: {
    mobileNumber?: string;
    cashPickupLocation?: string;
    cardNumber?: string;
    cardExpiryMonth?: string;
    cardExpiryYear?: string;
    cardHolderName?: string;
  };
  idempotencyKey?: string;
};

export type AirtimeRequest = {
  phoneNumber: string;
  amount: number;
  currency?: string;
  idempotencyKey?: string;
};
