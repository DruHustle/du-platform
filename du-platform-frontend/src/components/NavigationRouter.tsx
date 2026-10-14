import {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Router } from "wouter";
import { useBrowserLocation, useSearch } from "wouter/use-browser-location";
import { useTranslation } from "react-i18next";
import { RouteFallback } from "@/modules/core/routing";

/** Keep the last committed page interactive until a lazy destination is ready. */
export default function NavigationRouter({
  children,
}: {
  children: ReactNode;
}) {
  const [pathname, navigate] = useBrowserLocation();
  const search = useSearch();
  const destination = useMemo(() => ({ pathname, search }), [pathname, search]);
  const current = useDeferredValue(destination);
  const locationHook = useCallback(
    (): ReturnType<typeof useBrowserLocation> => [current.pathname, navigate],
    [current.pathname, navigate]
  );
  // Query-only navigation does not load another page module. Commit it eagerly
  // so a quick Back action cannot skip the intermediate form/query update.
  const currentSearch = current.pathname === pathname ? search : current.search;
  const searchHook = useCallback(() => currentSearch, [currentSearch]);
  const pending = current !== destination;
  const [showProgress, setShowProgress] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!pending) {
      setShowProgress(false);
      return;
    }
    // Fast transitions should never flash a loading indicator.
    const timer = window.setTimeout(() => setShowProgress(true), 200);
    return () => window.clearTimeout(timer);
  }, [pending]);

  return (
    <>
      {pending && showProgress && (
        <div role="status" className="fixed inset-x-0 top-0 z-[9999]">
          <div className="h-0.5 bg-zim-gold" aria-hidden="true" />
          <span className="sr-only">
            {t("routing.loading_page_content", {
              defaultValue: "Loading page content",
            })}
          </span>
        </div>
      )}
      <Router hook={locationHook} searchHook={searchHook}>
        <Suspense fallback={<RouteFallback />}>{children}</Suspense>
      </Router>
    </>
  );
}
