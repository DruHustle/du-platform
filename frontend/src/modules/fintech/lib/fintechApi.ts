import { api } from '@/lib/api';
import type { FxQuote } from '../types/fintech';

export async function previewFxQuote(payload: {
  amountSent: number;
  currencyFrom: string;
  currencyTo: string;
  receivingCountry: string;
}) {
  const response = await api.post<FxQuote>('/fintech/remittance/quote', payload);
  return response.data;
}
