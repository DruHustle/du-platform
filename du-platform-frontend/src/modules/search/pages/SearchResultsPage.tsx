import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  ArrowRight,
  FileText,
  Globe,
  TrendingUp,
  Plane,
  Brain,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { api } from "@/lib/api";

export default function SearchResults() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback });
  const [, setLocation] = useLocation();
  const search = useSearch();
  const query = new URLSearchParams(search).get("q")?.trim() || "";
  const [draft, setDraft] = useState(query);
  const [results, setResults] = useState<
    Array<{ title: string; href: string; category: string; summary?: string }>
  >([]);
  const [loading, setLoading] = useState(Boolean(query));
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const iconByCategory: Record<string, any> = {
    Tourism: Plane,
    Investment: TrendingUp,
    Technology: Brain,
    NTIR: Globe,
    Compliance: FileText,
  };
  const categoryLabels: Record<string, string> = {
    Tourism: tr("search.categories.tourism", "Tourism"),
    Investment: tr("search.categories.investment", "Investment"),
    Technology: tr("search.categories.technology", "Technology"),
    NTIR: tr("search.categories.ntir", "NTIR"),
    Compliance: tr("search.categories.compliance", "Compliance"),
  };

  useEffect(() => setDraft(query), [query]);

  useEffect(() => {
    const controller = new AbortController();
    setResults([]);
    setFailed(false);
    setLoading(Boolean(query));
    if (!query) return () => controller.abort();

    api
      .get("/search", {
        params: { q: query },
        timeout: 15_000,
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (!controller.signal.aborted) setResults(data?.results ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, retry]);

  return (
    <Layout>
      <section className="document-section bg-slate-950 min-h-[60vh] text-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <Search className="h-8 w-8 text-zim-gold" />
              <h1 className="page-title">
                {query
                  ? tr(
                      "search.results.title_with_query",
                      `Search Results for "{{query}}"`
                    ).replace("{{query}}", query)
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
              <Button
                type="submit"
                className="h-auto bg-zim-gold text-zim-black"
              >
                {tr("search.submit", "Search")}
              </Button>
            </form>
            {loading ? (
              <p role="status" className="py-12 text-white/80">
                {tr("search.loading", "Searching…")}
              </p>
            ) : failed ? (
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
                  "Search for tourism, investment, shopping, or Onesa AI."
                )}
              </p>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((result, index) => {
                  const Icon = iconByCategory[result.category] ?? Globe;
                  return (
                    <motion.div
                      key={`${result.href}-${result.title}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Link href={result.href}>
                        <Card className="surface-card h-full hover:shadow-xl transition-all cursor-pointer group border border-white/10 bg-white/[0.02] text-white">
                          <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <div className="p-3 bg-zim-gold/10 rounded-xl text-zim-gold group-hover:bg-zim-gold group-hover:text-zim-black transition-colors">
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <Badge
                                variant="secondary"
                                className="mb-1 bg-white/10 text-white border border-white/20"
                              >
                                {categoryLabels[result.category] ??
                                  result.category}
                              </Badge>
                              <h2 className="text-xl font-semibold">
                                {result.href === "/ntir" &&
                                result.title === "NTIR Database"
                                  ? t("investment.ntir.title")
                                  : result.title}
                              </h2>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className=" text-sm mb-4">
                              {result.summary ||
                                tr(
                                  "search.results.summary_fallback",
                                  `Explore ${result.title.toLowerCase()} and related opportunities on Diaspora Unlocked.`
                                )}
                            </p>
                            <div className="flex items-center text-zim-gold font-semibold text-sm group-hover:gap-2 transition-all">
                              {tr(
                                "search.results.view_details",
                                "View Details"
                              )}{" "}
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-white/10">
                <Search className="h-16 w-16  mx-auto mb-6 opacity-40" />
                <h2 className="text-2xl font-semibold mb-2 text-white">
                  {tr("search.no_results.title", "No results found")}
                </h2>
                <p className=" max-w-md mx-auto">
                  {tr(
                    "search.no_results.message",
                    `We couldn't find anything matching "{{query}}". Try searching for broader terms like "Investment", "Tourism", or "Onesa".`
                  ).replace("{{query}}", query)}
                </p>
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
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
