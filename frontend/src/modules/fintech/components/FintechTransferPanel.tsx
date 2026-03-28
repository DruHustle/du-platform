import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { useFxQuotePreview } from '../hooks/useFxQuotePreview';

export default function FintechTransferPanel() {
  const { t } = useTranslation();
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
      <h3 className="text-sm font-black uppercase tracking-wider text-white/75">
        {t("fintech.transfer_panel.title", { defaultValue: "Fintech Module Example" })}
      </h3>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          type="number"
          min="1"
          placeholder={t("fintech.transfer_panel.amount_placeholder", { defaultValue: "Amount to send" })}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <p className="mt-3 text-xs text-white/70">
        {loading
          ? t("fintech.transfer_panel.loading", { defaultValue: "Loading quote..." })
          : t("fintech.transfer_panel.fx_fee", {
              fx: quote?.fxRate ?? 0,
              fee: quote?.fee ?? 0,
              defaultValue: "FX: {{fx}} | Fee: {{fee}}",
            })}
      </p>
    </div>
  );
}
