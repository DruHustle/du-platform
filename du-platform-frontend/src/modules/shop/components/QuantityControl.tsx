import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  name: string;
  quantity: number;
  limit: number;
  onAdd: () => void;
  onRemove: () => void;
  disabled?: boolean;
};
export default function QuantityControl({
  name,
  quantity,
  limit,
  onAdd,
  onRemove,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const buttonClass =
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zim-gold disabled:cursor-not-allowed disabled:opacity-35";
  return (
    <div
      className="inline-flex items-center gap-1.5"
      role="group"
      aria-label={t("shop.cart_controls.quantity", {
        name,
        defaultValue: "{{name}} quantity",
      })}
    >
      {quantity > 0 && (
        <>
          <button
            type="button"
            aria-label={t("shop.cart_controls.remove", {
              name,
              defaultValue: "Remove one {{name}}",
            })}
            onClick={onRemove}
            className={`${buttonClass} border border-white/20 bg-white/5 text-white hover:bg-white/15`}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span
            className="min-w-5 text-center text-sm font-semibold text-white tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {quantity}
          </span>
        </>
      )}
      <button
        type="button"
        aria-label={
          t("shop.products.actions.add_to_cart", {
            defaultValue: "Add to Cart",
          }) +
          ": " +
          name
        }
        onClick={onAdd}
        disabled={disabled || quantity >= limit}
        className={`${buttonClass} bg-zim-gold text-slate-950 hover:bg-yellow-300`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
