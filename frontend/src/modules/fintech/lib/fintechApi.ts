import { api } from '@/lib/api';
import type { ApiResult } from '@/types/api';
import type { FxQuote } from '../types/fintech';

export async function previewFxQuote(payload: {
  amountSent: number;
  currencyFrom: string;
  currencyTo: string;
  receivingCountry: string;
}) {
  const response = await api.post<ApiResult<{ fxQuote: FxQuote }>>('/remittance/quote', payload);
  return response.data;
}
