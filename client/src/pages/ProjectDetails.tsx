import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, MapPin, Ruler, Landmark, Building2 } from "lucide-react";
import { Link, useRoute } from "wouter";

type ProjectDetails = {
  title: string;
  subtitle: string;
  overview: string;
  highlights: string[];
  stats: Array<{ label: string; value: string }>;
};

const PROJECTS: Record<string, ProjectDetails> = {
  masuwe: {
    title: "Masuwe Special Economic Zone",
    subtitle: "Tourism and Financial Services Cluster near Victoria Falls",
    overview:
      "Masuwe SEZ is located about 10km from Victoria Falls City on the Victoria Falls-Bulawayo highway. It was established under General Notice 747 of 2018 and is governed by the ZIDA Act (Chapter 14.37).",
    highlights: [
      "Total area: 1,200 hectares designated for Tourism and Financial Services.",
      "Phase 1: 271.5 hectares titled under Mosi Oa Tunya Development Company.",
      "Phase 2: 930 hectares to follow after Phase 1 stabilization.",
      "Subdivision layout and development permit approved (June 2024).",
      "Cadastral survey completed (May 2025).",
      "International Cricket Stadium partnership with Zimbabwe Cricket, with surrounding villas and lodges.",
      "Golf Estate includes a 44-hectare golf course and 64 holiday homes.",
      "Hotel & Conference Centre sites: 4ha, 6ha, and 9ha.",
      "Medical resort sites: 9ha and 4ha for international-standard health tourism.",
      "International Finance Services Centre established via SI 29 of 2025 on 3.5ha.",
    ],
    stats: [
      { label: "Total SEZ Area", value: "1,200 ha" },
      { label: "Phase 1", value: "271.5 ha" },
      { label: "Phase 2", value: "930 ha" },
      { label: "Golf Course", value: "44 ha" },
      { label: "Holiday Homes", value: "64 Units" },
      { label: "IFSC Site", value: "3.5 ha" },
    ],
  },
  leather: {
    title: "Leather Cluster",
    subtitle: "Value-addition and export-ready manufacturing",
    overview: "Regional leather processing and finished goods export pipeline with quality assurance controls.",
    highlights: ["Export-focused production", "Skilled labor pipeline", "Regional market access"],
    stats: [{ label: "Target", value: "$180k" }],
  },
  apparel: {
    title: "ZimBrand Supply Chain",
    subtitle: "Branded merchandise and sports apparel",
    overview: "Apparel distribution and licensing model for sports and institutional supply.",
    highlights: ["Global licensing model", "Sports partnerships", "Scalable distribution"],
    stats: [{ label: "Target", value: "$300k" }],
  },
  horticulture: {
    title: "Blueberry Farm",
    subtitle: "High-value export crop operations",
    overview: "Export-quality berry production with compliance-ready processing and logistics.",
    highlights: ["GLOBALG.A.P alignment", "Off-season export window", "Water-efficient production"],
    stats: [{ label: "Target", value: "$120k" }],
  },
  fintech: {
    title: "ZimPay Core",
    subtitle: "Diaspora remittance infrastructure",
    overview: "Secure payments infrastructure for regional remittance flows.",
    highlights: ["Secure APIs", "SaaS monetization", "Regional scalability"],
    stats: [{ label: "Target", value: "$850k" }],
  },
  solar: {
    title: "Mutare Solar Park",
    subtitle: "Grid-tied industrial clean energy",
    overview: "Utility-grade solar project for stable power supply and long-term returns.",
    highlights: ["Utility PPA structure", "Carbon-credit upside", "Predictable yield profile"],
    stats: [{ label: "Target", value: "$2.5M" }],
  },
};

export default function ProjectDetails() {
  const [matched, params] = useRoute<{ id: string }>("/investment/projects/:id");
  const project = matched && params?.id ? PROJECTS[params.id] : null;

  return (
    <Layout>
      <section className="min-h-screen bg-slate-950 px-6 py-28">
        <div className="container mx-auto max-w-5xl space-y-8">
          <Link href="/investment" className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-white/70 hover:text-zim-gold">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Investment
          </Link>

          {!project ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-white">
              <h1 className="text-3xl font-black">Project not found</h1>
              <p className="text-white/60 mt-2">The selected project ID does not exist.</p>
            </div>
          ) : (
            <>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10 text-white">
                <Badge className="mb-4 bg-zim-gold/10 text-zim-gold border border-zim-gold/20 uppercase text-[10px] tracking-widest font-black">
                  Project Details
                </Badge>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter">{project.title}</h1>
                <p className="mt-3 text-white/60">{project.subtitle}</p>
                <p className="mt-6 text-white/80 leading-relaxed">{project.overview}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-white">
                  <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-zim-gold" /> Highlights
                  </h2>
                  <ul className="space-y-3">
                    {project.highlights.map((item) => (
                      <li key={item} className="text-sm text-white/80 leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-white">
                  <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-zim-gold" /> Key Metrics
                  </h2>
                  <div className="space-y-3">
                    {project.stats.map((stat) => (
                      <div key={stat.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                        <span className="text-white/60 text-sm">{stat.label}</span>
                        <span className="font-black">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-white grid md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-white/40 text-xs uppercase tracking-widest">Location</p>
                  <p className="font-bold mt-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-zim-gold" /> Victoria Falls Corridor
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-white/40 text-xs uppercase tracking-widest">Land Framework</p>
                  <p className="font-bold mt-2 flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-zim-gold" /> Phased Servicing
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-white/40 text-xs uppercase tracking-widest">Regulatory</p>
                  <p className="font-bold mt-2 flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-zim-gold" /> ZIDA / SI 29 (IFSC)
                  </p>
                </div>
              </div>

              <div>
                <Link href="/ntir">
                  <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest rounded-xl">
                    Search NTIR Database
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}

