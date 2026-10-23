import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
export function useAdminDraft(onDirtyChange?: (dirty: boolean) => void) {
  const [dirty, setDirty] = useState(false);
  const { t } = useTranslation();
  const confirmDiscard = () =>
    !dirty || window.confirm(t("pilot.discard_changes"));
  useEffect(() => {
    onDirtyChange?.(dirty);
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const leave = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.("a[href]");
      if (!dirty || !link) return;
      const url = new URL(link.getAttribute("href")!, window.location.href);
      if (
        link.getAttribute("target") === "_blank" ||
        !["https:", "http:"].includes(url.protocol)
      )
        return;
      if (
        url.pathname !== "/admin" &&
        !window.confirm(t("pilot.discard_changes"))
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    if (dirty) {
      window.addEventListener("beforeunload", beforeUnload);
      document.addEventListener("click", leave, true);
    }
    return () => {
      onDirtyChange?.(false);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", leave, true);
    };
  }, [dirty, onDirtyChange, t]);
  return { dirty, setDirty, confirmDiscard };
}
