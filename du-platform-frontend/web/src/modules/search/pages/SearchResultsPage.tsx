import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Search,
  ArrowRight,
  FileText,
  Globe,
  TrendingUp,
  Plane,
  Brain,
  ShoppingBag,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { safeRedirectPath } from "@/lib/safeRedirect";

type SearchResult = {
  title: string;
  href: string;
  category: string;
  summary?: string;
};
function isSearchResult(item: unknown): item is SearchResult {
  if (!item || typeof item !== "object") return false;
  const row = item as Partial<SearchResult>;
  return typeof row.title === "string" && typeof row.category === "string" &&
    typeof row.href === "string" && safeRedirectPath(row.href) === row.href &&
    (row.summary === undefined || typeof row.summary === "string");
}

type SearchResponse = {
  query: string;
  results: SearchResult[];
  status: "complete" | "partial" | "failed";
};

const routeTitles = new Map([
  ["/travel/flights", "travel.flights"],
  ["/travel/stays", "travel.stays"],
  ["/travel/car-hire", "travel.car-hire"],
  ["/travel/my-trips", "travel.my-trips"],
  ["/travel/weather", "travel.weather"],
  ["/travel/explore", "travel.explore"],
  ["/travel/planner", "travel.onesa-planner"],
  ["/ntir", "investment.ntir.title"],
  ["/shop", "nav.shop"],
  ["/shop/products", "pilot.browse_products"],
  ["/shop/order-status", "pilot.request_status"],
  ["/shop/products?category=food&segment=beverages", "shop.categories.beverages.title"],
  ...(["sports", "crafts", "food"] as const).map(category =>
    [`/shop/products?category=${category}`, `admin.shop.categories.${category}`] as const
  ),
]);

export default function SearchResults() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback });
  const [, setLocation] = useLocation();
  const search = useSearch();
  const query = new URLSearchParams(search).get("q")?.trim() || "";
  const [draft, setDraft] = useState(query);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [pending, setPending] = useState(false);
  const current = response?.query === query ? response : null;
  const results = current?.results ?? [];
  const loading =
    Boolean(query) && (!current || (pending && current.status === "failed"));
  const [retry, setRetry] = useState(0);
  const iconByCategory: Record<string, LucideIcon> = {
    Tourism: Plane,
    Investment: TrendingUp,
    Technology: Brain,
    NTIR: Globe,
    Compliance: FileText,
    Shop: ShoppingBag,
    Product: ShoppingBag,
    Collection: Layers,
  };
  const categoryLabels: Record<string, string> = {
    Tourism: tr("search.categories.tourism", "Travel"),
    Investment: tr("search.categories.investment", "Investment"),
    Technology: tr("search.categories.technology", "Technology"),
    NTIR: tr("search.categories.ntir", "NTIR"),
    Shop: t("nav.shop"),
    Product: t("shop.product"),
    Collection: t("shop.collections"),
    Compliance: tr("search.categories.compliance", "Compliance"),
  };

  useEffect(() => setDraft(query), [query]);

  useEffect(() => {
    const controller = new AbortController();
    if (!query) {
      setResponse(null);
      setPending(false);
      return;
    }
    setPending(true);
    api
      .get("/search", {
        params: { q: query },
        timeout: 15_000,
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data?.results) || !data.results.every(isSearchResult))
          throw new Error("Invalid search response");
        const results: SearchResult[] = data.results;
        setResponse(previous => {
          if (data.partial !== true) return { query, results, status: "complete" };
          const returned = new Set(results.map(result => result.href));
          const retained = previous?.query === query
            ? previous.results.filter(result => !returned.has(result.href))
            : [];
          return { query, results: [...results, ...retained], status: "partial" };
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResponse(previous =>
          previous?.query === query && previous.results.length > 0
            ? { ...previous, status: "partial" }
            : { query, results: [], status: "failed" }
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });
    return () => controller.abort();
  }, [query, retry]);

  return (
    <Layout>
      <section className="document-section bg-slate-950 min-h-[60vh] text-white">
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <Search
              aria-hidden="true"
              className="h-8 w-8 shrink-0 text-zim-gold"
            />
            <h1 className="page-title min-w-0 [overflow-wrap:anywhere]">
              {query
                ? t("search.results.title_with_query", { query })
                : tr(
                    "search.results.title_default",
                    "Search Diaspora Unlocked"
                  )}
            </h1>
          </div>

          <form
            role="search"
            className="mb-8 flex gap-3"
            onSubmit={event => {
              event.preventDefault();
              setLocation(`/search?q=${encodeURIComponent(draft.trim())}`);
            }}
          >
            <label htmlFor="site-search" className="sr-only">
              {tr("search.results.title_default", "Search Diaspora Unlocked")}
            </label>
            <input
              id="site-search"
              type="search"
              value={draft}
              onChange={event => setDraft(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
            />
            <Button type="submit" className="h-auto bg-zim-gold text-zim-black">
              {tr("search.submit", "Search")}
            </Button>
          </form>
          {current?.status === "partial" && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <p role="status">{t("search.partial")}</p>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => setRetry(value => value + 1)}
              >
                {t("search.retry")}
              </Button>
            </div>
          )}
          {loading ? (
            <p role="status" className="py-12 text-white/80">
              {tr("search.loading", "Searching…")}
            </p>
          ) : current?.status === "failed" ? (
            <div
              role="alert"
              className="rounded-2xl border border-white/20 bg-slate-900 p-8"
            >
              <p>
                {tr(
                  "search.failed",
                  "Search is unavailable right now. Please try again."
                )}
              </p>
              <Button
                onClick={() => setRetry(value => value + 1)}
                className="mt-4 bg-zim-gold text-zim-black"
              >
                {tr("search.retry", "Try again")}
              </Button>
            </div>
          ) : !query ? (
            <p className="py-12 text-white/80">
              {tr(
                "search.prompt",
                "Search for travel, investment, shopping, or Onesa AI."
              )}
            </p>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map(result => {
                const Icon = iconByCategory[result.category] ?? Globe;
                const titleKey = routeTitles.get(result.href);
                return (
                  <Link
                    key={`${result.href}-${result.title}`}
                    href={result.href}
                    className="group flex min-w-0 items-start gap-3 rounded-xl border border-white/15 bg-white/[0.03] p-4 text-white hover:border-zim-gold/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zim-gold sm:p-5"
                  >
                    <span className="rounded-lg bg-zim-gold/10 p-2.5 text-zim-gold">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                      <span className="text-sm text-white/70">
                        {categoryLabels[result.category] ?? result.category}
                      </span>
                      <h2 className="mt-0.5 text-lg font-semibold">
                        {titleKey ? t(titleKey) : result.title}
                      </h2>
                      {result.summary && (
                        <p className="mt-2 text-sm text-white/80">
                          {result.summary}
                        </p>
                      )}
                    </div>
                    <ArrowRight
                      aria-hidden="true"
                      className="mt-3 h-4 w-4 shrink-0 text-zim-gold"
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-white/10">
              <Search className="h-16 w-16  mx-auto mb-6 opacity-40" />
              <h2 className="text-2xl font-semibold mb-2 text-white">
                {tr("search.no_results.title", "No results found")}
              </h2>
              <p className="mx-auto max-w-md [overflow-wrap:anywhere]">
                {t("search.no_results.message", { query })}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-5 text-zim-gold underline">
                <Link href="/shop/products">{t("pilot.browse_products")}</Link>
                <Link href="/travel">
                  {t("nav.tourism", { defaultValue: "Travel" })}
                </Link>
              </div>
              <Button
                asChild
                className="mt-8 border-white/20 text-white hover:bg-white hover:text-zim-black"
                variant="outline"
              >
                <Link href="/">
                  {tr("search.no_results.return_home", "Return Home")}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
