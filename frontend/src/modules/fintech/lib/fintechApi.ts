import { api } from '@/lib/api';
import type { FxQuote } from '../types/fintech';

export type RemittanceConfig = {
  senderCountries: Array<{ code: string; flag: string; name: string; currency: string }>;
  supportedBanks: string[];
  transferLimits: {
    maxPerTransaction: number;
    dailyLimit: number;
    weeklyLimit: number;
    monthlyLimit: number;
  };
};

export async function fetchRemittanceConfig(signal?: AbortSignal): Promise<RemittanceConfig | null> {
  try {
    const response = await api.get<RemittanceConfig>('/fintech/remittance/config', { signal });
    return response.data ?? null;
  } catch {
    return null;
  }
}

export async function previewFxQuote(
  payload: {
    amountSent: number;
    currencyFrom: string;
    currencyTo: string;
    receivingCountry: string;
  },
  signal?: AbortSignal,
) {
  const response = await api.post<FxQuote>('/fintech/remittance/quote', payload, { signal });
  return response.data;
}
