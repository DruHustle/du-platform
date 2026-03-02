import { useState } from 'react';
import { useFxQuotePreview } from '../hooks/useFxQuotePreview';

export default function FintechTransferPanel() {
  const [amount, setAmount] = useState('');
  const numericAmount = Number(amount || 0);

  const { quote, loading } = useFxQuotePreview({
    enabled: true,
    amountSent: Number.isFinite(numericAmount) ? numericAmount : 0,
    currencyFrom: 'EUR',
    currencyTo: 'USD',
    receivingCountry: 'ZW',
  });

  return (
    <div className="module-card p-4">
      <h3 className="text-sm font-black uppercase tracking-wider text-white/75">Fintech Module Example</h3>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          type="number"
          min="1"
          placeholder="Amount to send"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <p className="mt-3 text-xs text-white/70">
        {loading ? 'Loading quote...' : `FX: ${quote?.fxRate ?? quote?.exchangeRate ?? 0} | Fee: ${quote?.fee ?? 0}`}
      </p>
    </div>
  );
}
