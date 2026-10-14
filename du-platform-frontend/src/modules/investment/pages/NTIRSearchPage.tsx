import { useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, getApiErrorMessage } from "@/lib/api";
import { ArrowLeft, Search } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

type NTIREntity = {
  id: number;
  name: string;
  sector: string;
  location: string;
  verification_status: "Verified" | "Pending";
};

const fallbackEntities: NTIREntity[] = [
  {
    id: 1,
    name: "Mosi Oa Tunya Development Company",
    sector: "Tourism & Infrastructure",
    location: "Matabeleland North",
    verification_status: "Verified",
  },
  {
    id: 2,
    name: "Agro Strong (Pvt) Ltd",
    sector: "Agriculture",
    location: "Matabeleland South",
    verification_status: "Verified",
  },
  {
    id: 3,
    name: "Goromonzi Agro Industrial Company (GAIC)",
    sector: "Agriculture",
    location: "Mashonaland East",
    verification_status: "Verified",
  },
  {
    id: 4,
    name: "Cicada Group",
    sector: "Agriculture",
    location: "Midlands / Manicaland",
    verification_status: "Verified",
  },
  {
    id: 5,
    name: "Misty Mountains Coffee Company",
    sector: "Agriculture",
    location: "Manicaland",
    verification_status: "Pending",
  },
  {
    id: 6,
    name: "Fairway (Pvt) Ltd",
    sector: "Agriculture",
    location: "Manicaland",
    verification_status: "Pending",
  },
  {
    id: 7,
    name: "Powertel Communications (Pvt) Ltd",
    sector: "ICT",
    location: "Harare",
    verification_status: "Verified",
  },
  {
    id: 8,
    name: "TelOne (Pvt) Ltd",
    sector: "ICT",
    location: "Harare",
    verification_status: "Verified",
  },
  {
    id: 9,
    name: "Linkdef Soap Manufacturing (Pvt) Ltd",
    sector: "Manufacturing",
    location: "Harare",
    verification_status: "Pending",
  },
  {
    id: 10,
    name: "National Railways of Zimbabwe",
    sector: "Manufacturing",
    location: "Bulawayo",
    verification_status: "Verified",
  },
  {
    id: 11,
    name: "Solgas Energy Pvt Ltd",
    sector: "Renewable Energy",
    location: "Matabeleland North",
    verification_status: "Verified",
  },
  {
    id: 12,
    name: "RADCO Holdings",
    sector: "Renewable Energy",
    location: "Mashonaland Central",
    verification_status: "Pending",
  },
  {
    id: 13,
    name: "SIRDC",
    sector: "Biotech Manufacturing",
    location: "Harare",
    verification_status: "Verified",
  },
  {
    id: 14,
    name: "Orangerose Investments",
    sector: "Clean-Tech Manufacturing",
    location: "Harare",
    verification_status: "Pending",
  },
  {
    id: 15,
    name: "Mining Promotion Corporation",
    sector: "Mining",
    location: "Matabeleland South",
    verification_status: "Pending",
  },
  {
    id: 16,
    name: "Sunway City (Pvt) Ltd",
    sector: "Urban Infrastructure",
    location: "Harare",
    verification_status: "Pending",
  },
];

function searchFallbackEntities(query: string): NTIREntity[] {
  const q = query.trim().toLowerCase();
  if (!q) return fallbackEntities;
  return fallbackEntities.filter(entity =>
    [entity.name, entity.sector, entity.location].some(value =>
      value.toLowerCase().includes(q)
    )
  );
}

export default function NTIRSearchPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NTIREntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestRef = useRef<AbortController | null>(null);

  const runSearch = async (q = "") => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const { data } = await api.get("/investment/ntir/search", {
        params: { q },
        signal: controller.signal,
        timeout: 15_000,
      });
      if (controller.signal.aborted) return;
      setResults(Array.isArray(data?.results) ? data.results : []);
    } catch (err: any) {
      if (controller.signal.aborted) return;
      const apiMessage = getApiErrorMessage(err, "");
      setResults(searchFallbackEntities(q));
      setError(
        apiMessage ||
          t("investment.ntir.service_unavailable", {
            defaultValue:
              "NTIR service unavailable right now. Showing Trade Zimbabwe directory fallback results.",
          })
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    void runSearch("");
    return () => requestRef.current?.abort();
  }, []);

  return (
    <Layout>
      <section className="document-section min-h-screen bg-slate-950">
        <div className="container mx-auto max-w-5xl space-y-8">
          <div className="text-white">
            <Link
              href="/investment"
              className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-white/70 hover:text-zim-gold mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-2" />
              {t("investment.ntir.back", {
                defaultValue: "Back to Investment",
              })}
            </Link>
            <h1 className="page-title">
              {t("investment.ntir.title", {
                defaultValue: "NTIR Database Search",
              })}
            </h1>
            <p className="text-sm text-white/70 mt-2">
              {t("investment.ntir.subtitle", {
                defaultValue:
                  "Search the National Trade & Investment Register for verified entities and fallback exporter records.",
              })}
            </p>
          </div>

          <form
            className="flex gap-3"
            onSubmit={e => {
              e.preventDefault();
              runSearch(query);
            }}
          >
            <Input
              id="ntir-search"
              aria-label={t("investment.ntir.placeholder", {
                defaultValue: "Search by entity, sector, or location",
              })}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t("investment.ntir.placeholder", {
                defaultValue: "Search by entity, sector, or location",
              })}
              className="bg-white/[0.05] border-white/20 text-white"
            />
            <Button
              type="submit"
              className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest"
            >
              <Search className="h-4 w-4 mr-2" />{" "}
              {t("investment.ntir.search", { defaultValue: "Search" })}
            </Button>
          </form>

          {error ? (
            <p role="alert" className="text-red-400">
              {error}
            </p>
          ) : null}
          {loading ? (
            <p role="status" className="text-white/70">
              {t("common.loading", { defaultValue: "Loading..." })}
            </p>
          ) : null}

          <div className="grid gap-4">
            {results.map(row => (
              <div
                key={row.id}
                className="surface-card p-7 text-white"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-black tracking-tight">
                      {row.name}
                    </h2>
                    <p className="text-white/75 text-sm mt-1">
                      {row.location}
                    </p>
                  </div>
                  <Badge
                    className={
                      row.verification_status === "Verified"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                    }
                  >
                    {row.verification_status === "Verified"
                      ? t("common.verified", { defaultValue: "Verified" })
                      : t("common.pending", { defaultValue: "Pending" })}
                  </Badge>
                </div>
                <p className="text-white/70 !text-[11px] mt-3">{row.sector}</p>
              </div>
            ))}
            {!loading && results.length === 0 ? (
              <p className="text-white/70">
                {t("investment.ntir.empty", {
                  defaultValue: "No entities found.",
                })}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </Layout>
  );
}
