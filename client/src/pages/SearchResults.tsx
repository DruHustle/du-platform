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

export default function SearchResults() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  // Mock data for search - in a real app, this would come from an API or a search index
  const searchableContent = [
    { title: t('nav.export'), href: "/export-hub", category: "Trade", icon: FileText, tags: ["export", "germany", "market", "trade"] },
    { title: t('nav.tourism'), href: "/tourism", category: "Tourism", icon: Plane, tags: ["visit", "travel", "attractions", "victoria falls"] },
    { title: t('nav.investment'), href: "/investment", category: "Investment", icon: TrendingUp, tags: ["money", "capital", "projects", "masuwe", "sez"] },
    { title: t('nav.trade'), href: "/trade", category: "Trade", icon: Globe, tags: ["business", "commerce", "sectors"] },
    { title: t('nav.technology'), href: "/technology", category: "Technology", icon: Brain, tags: ["ai", "onesa", "innovation", "tech"] },
    { title: t('nav.success'), href: "/success-stories", category: "Impact", icon: Award, tags: ["stories", "impact", "cases"] },
    { title: "Onesa AI", href: "/technology", category: "Technology", icon: Brain, tags: ["ai", "illuminate", "shona", "context"] },
    { title: "Masuwe SEZ", href: "/investment", category: "Investment", icon: TrendingUp, tags: ["victoria falls", "special economic zone", "tourism"] },
    { title: "Kukiya-kiya Economy", href: "/technology", category: "Technology", icon: Brain, tags: ["hustle", "informal", "mbare"] },
  ];

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const q = searchParams.get("q") || "";
    setQuery(q);

    if (q) {
      const filtered = searchableContent.filter(item => 
        item.title.toLowerCase().includes(q.toLowerCase()) || 
        item.category.toLowerCase().includes(q.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(q.toLowerCase()))
      );
      setResults(filtered);
    }
  }, [window.location.search, t]);

  return (
    <Layout>
      <div className="h-[85px] bg-slate-900/95 w-full" />
      <section className="py-24 bg-muted/30 min-h-[60vh]">
     
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <Search className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">
                {query ? `Search Results for "${query}"` : "Search ZIGD Platform"}
              </h1>
            </div>

            {results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((result, index) => {
                  const Icon = result.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Link href={result.href}>
                        <Card className="h-full hover:shadow-xl transition-all cursor-pointer group border-none shadow-md">
                          <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <Badge variant="secondary" className="mb-1">{result.category}</Badge>
                              <CardTitle className="text-xl">{result.title}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground text-sm mb-4">
                              Explore {result.title.toLowerCase()} and related opportunities on the ZIGD platform.
                            </p>
                            <div className="flex items-center text-primary font-semibold text-sm group-hover:gap-2 transition-all">
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
              <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-border">
                <Search className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-20" />
                <h2 className="text-2xl font-semibold mb-2">No results found</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We couldn't find anything matching "{query}". Try searching for broader terms like "Investment", "Trade", or "Onesa".
                </p>
                <Link href="/">
                  <Button className="mt-8" variant="outline">Return Home</Button>
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
