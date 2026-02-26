import { useEffect, useState } from 'react';
import { previewFxQuote } from '../lib/fintechApi';
import type { FxQuote } from '../types/fintech';

export function useFxQuotePreview(input: {
  enabled: boolean;
  amountSent: number;
  currencyFrom: string;
  currencyTo: string;
  receivingCountry: string;
}) {
  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input.enabled || input.amountSent <= 0) {
      setQuote(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await previewFxQuote({
          amountSent: input.amountSent,
          currencyFrom: input.currencyFrom,
          currencyTo: input.currencyTo,
          receivingCountry: input.receivingCountry,
        });
        if (result.success) setQuote(result.data.fxQuote ?? null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [input.amountSent, input.currencyFrom, input.currencyTo, input.enabled, input.receivingCountry]);

  return { quote, loading };
}
