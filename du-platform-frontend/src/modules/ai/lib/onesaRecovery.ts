import { invalidateOfflineOnesaHealth } from "./aiApi";

// Recheck an open chat after a transient outage, tab return or reconnection.
// One shared API cache coalesces checks from the full page and floating chat.
export function watchOnesaRecovery(check: () => Promise<unknown>) {
  const refresh = () => {
    if (document.visibilityState !== "hidden") {
      invalidateOfflineOnesaHealth();
      void check();
    }
  };
  refresh();
  const timer = window.setInterval(refresh, 30_000);
  window.addEventListener("online", refresh);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("online", refresh);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}
