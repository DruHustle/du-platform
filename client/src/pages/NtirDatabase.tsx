import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { ArrowLeft, Search } from "lucide-react";
import { Link } from "wouter";

type NtirEntity = {
  id: number;
  name: string;
  sector: string;
  location: string;
  verification_status: "Verified" | "Pending";
};

const fallbackEntities: NtirEntity[] = [
  { id: 1, name: "Matseka Trade Pvt Ltd", sector: "Horticulture Export", location: "Harare", verification_status: "Verified" },
  { id: 2, name: "Berrymark Trading P/L", sector: "Fresh Produce Export", location: "Harare", verification_status: "Verified" },
  { id: 3, name: "Fair Mark Enterprises P/L", sector: "Fresh Produce Export", location: "Harare", verification_status: "Pending" },
  { id: 4, name: "Flitvick Exports Pvt Ltd", sector: "Horticulture Export", location: "Harare", verification_status: "Verified" },
  { id: 5, name: "Hortech (Pvt) Ltd", sector: "Horticulture Export", location: "Harare", verification_status: "Pending" },
  { id: 6, name: "Matanuska (Pvt) Ltd", sector: "Fresh Produce Export", location: "Honde Valley", verification_status: "Verified" },
  { id: 7, name: "Schmoozy Fresh (Pvt) Ltd", sector: "Horticulture Export", location: "Harare", verification_status: "Pending" },
  { id: 8, name: "Jumbo Fresh (Pvt) Ltd", sector: "Horticulture Export", location: "Harare", verification_status: "Verified" },
  { id: 9, name: "Linkage Agencies (Pvt) Ltd", sector: "Horticulture Export", location: "Harare", verification_status: "Verified" },
  { id: 10, name: "Chammy International (Pvt) Ltd", sector: "Fresh Produce Export", location: "Mutare", verification_status: "Pending" },
];

function searchFallbackEntities(query: string): NtirEntity[] {
  const q = query.trim().toLowerCase();
  if (!q) return fallbackEntities;
  return fallbackEntities.filter((entity) =>
    [entity.name, entity.sector, entity.location].some((value) => value.toLowerCase().includes(q))
  );
}

export default function NtirDatabase() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NtirEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runSearch = async (q = "") => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/ntir/search", { params: { q } });
      setResults(data.results ?? []);
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message;
      setResults(searchFallbackEntities(q));
      setError(apiMessage ?? "NTIR service unavailable right now. Showing Trade Zimbabwe directory fallback results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch("");
  }, []);

  return (
    <Layout>
      <section className="min-h-screen bg-slate-950 px-6 py-28">
        <div className="container mx-auto max-w-5xl space-y-8">
          <div className="text-white">
            <Link href="/investment" className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-white/70 hover:text-zim-gold mb-4">
              <ArrowLeft className="h-3.5 w-3.5 mr-2" />
              Back to Investment
            </Link>
            <h1 className="!text-2xl md:!text-2xl font-black tracking-tighter">NTIR Database Search</h1>
            <p className="!text-xs text-white/60 mt-2">Search the National Trade & Investment Register for verified entities and fallback exporter records.</p>
          </div>

          <form
            className="flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(query);
            }}
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by entity, sector, or location"
              className="bg-white/[0.05] border-white/20 text-white"
            />
            <Button type="submit" className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </form>

          {error ? <p className="text-red-400">{error}</p> : null}
          {loading ? <p className="text-white/60">Loading...</p> : null}

          <div className="grid gap-4">
            {results.map((row) => (
              <div key={row.id} className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="!text-sm font-black tracking-tight">{row.name}</h2>
                    <p className="text-white/75 !text-xs mt-1">{row.location}</p>
                  </div>
                  <Badge className={row.verification_status === "Verified" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"}>
                    {row.verification_status}
                  </Badge>
                </div>
                <p className="text-white/70 !text-[11px] mt-3">{row.sector}</p>
              </div>
            ))}
            {!loading && results.length === 0 ? <p className="text-white/50">No entities found.</p> : null}
          </div>
        </div>
      </section>
    </Layout>
  );
}
