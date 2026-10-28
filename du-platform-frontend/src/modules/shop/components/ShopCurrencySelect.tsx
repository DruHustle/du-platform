import { NativeSelect } from "@/components/ui/native-select";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { SHOP_CURRENCIES, type ShopCurrency } from "@/contracts/shopCurrency";
import { useShopCurrency } from "../lib/useShopCurrency";

export default function ShopCurrencySelect({
  disabled = false,
  compact = false,
}: {
  disabled?: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const id = useId();
  const { currency, setCurrency } = useShopCurrency();
  return (
    <div
      className={`shop-currency-control flex max-w-full flex-col gap-2 text-sm text-slate-300 ${compact ? "w-44" : ""}`}
    >
      <label htmlFor={id} className={compact ? "sr-only" : undefined}>
        {t("shop.currency.label")}
      </label>
      <NativeSelect
        id={id}
        value={currency}
        disabled={disabled}
        onChange={event => setCurrency(event.target.value as ShopCurrency)}
        className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-zim-gold"
      >
        {SHOP_CURRENCIES.map(code => (
          <option key={code} value={code}>
            {t(`shop.currency.${code}`)}
          </option>
        ))}
      </NativeSelect>
      {!compact && (
        <p className="max-w-lg text-xs leading-5 text-slate-400">
          {t("shop.currency.note")}
        </p>
      )}
    </div>
  );
}
