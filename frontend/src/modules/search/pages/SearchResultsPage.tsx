import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, FileText, Globe, TrendingUp, Plane, Brain, Award } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { api } from "@/lib/api";

export default function SearchResults() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const iconByCategory: Record<string, any> = {
    Trade: FileText,
    Tourism: Plane,
    Investment: TrendingUp,
    Technology: Brain,
    Impact: Award,
    NTIR: Globe,
    Compliance: FileText,
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const q = searchParams.get("q") || "";
    setQuery(q);

    if (!q) {
      setResults([]);
      return;
    }

    api
      .get("/search", { params: { q } })
      .then(({ data }) => setResults(data?.results ?? []))
      .catch(() => setResults([]));
  }, [location, t]);

  return (
    <Layout>
      <div className="h-[85px] bg-slate-900/95 w-full" />
      <section className="py-24 bg-slate-950 min-h-[60vh]">
     
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <Search className="h-8 w-8 text-zim-gold" />
              <h1 className="text-4xl font-bold text-white">
                {query ? `Search Results for "${query}"` : "Search Diaspora Unlocked"}
              </h1>
            </div>

            {results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((result, index) => {
                  const Icon = iconByCategory[result.category] ?? Globe;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Link href={result.href}>
                        <Card className="h-full hover:shadow-xl transition-all cursor-pointer group border border-white/10 bg-white/[0.02] text-white">
                          <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <div className="p-3 bg-zim-gold/10 rounded-xl text-zim-gold group-hover:bg-zim-gold group-hover:text-zim-black transition-colors">
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <Badge variant="secondary" className="mb-1 bg-white/10 text-white border border-white/20">{result.category}</Badge>
                              <CardTitle className="text-xl">{result.title}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className=" text-sm mb-4">{result.summary || `Explore ${result.title.toLowerCase()} and related opportunities on Diaspora Unlocked.`}</p>
                            <div className="flex items-center text-zim-gold font-semibold text-sm group-hover:gap-2 transition-all">
                              View Details <ArrowRight className="h-4 w-4 ml-1" />
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
                <h2 className="text-2xl font-semibold mb-2 text-white">No results found</h2>
                <p className=" max-w-md mx-auto">
                  We couldn't find anything matching "{query}". Try searching for broader terms like "Investment", "Trade", or "Onesa".
                </p>
                <Button asChild className="mt-8 border-white/20 text-white hover:bg-white hover:text-zim-black" variant="outline">
                  <Link href="/">Return Home</Link>
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
