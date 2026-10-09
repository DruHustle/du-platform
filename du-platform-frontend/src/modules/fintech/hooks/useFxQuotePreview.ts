import { useEffect, useRef, useState } from 'react';
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
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!input.enabled || input.amountSent <= 0) {
      setQuote(null);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      // Cancel any in-flight request before starting a new one.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const result = await previewFxQuote(
          {
            amountSent: input.amountSent,
            currencyFrom: input.currencyFrom,
            currencyTo: input.currencyTo,
            receivingCountry: input.receivingCountry,
          },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setQuote(result ?? null);
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          setQuote(null);
          setError(
            String(
              err?.response?.data?.message ??
                err?.message ??
                'Unable to load exchange rate.',
            ),
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [input.amountSent, input.currencyFrom, input.currencyTo, input.enabled, input.receivingCountry]);

  return { quote, loading, error };
}
