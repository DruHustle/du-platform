import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Keep native keyboard/mobile selection while styling a full-sized touch target
 * in WebKit too (macOS menulists otherwise ignore their minimum height). */
export function NativeSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative min-w-0">
      <select
        {...props}
        className={cn(
          "min-h-11 w-full appearance-none rounded-lg border border-slate-600 bg-slate-900 py-2 pl-3 pr-9 text-white focus-visible:outline-2 focus-visible:outline-zim-gold disabled:opacity-60",
          className
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300"
      />
    </div>
  );
}
