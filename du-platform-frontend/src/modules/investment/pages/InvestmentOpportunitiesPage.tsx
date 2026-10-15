import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import SwipeRail from "@/components/discovery/SwipeRail";
import DiscoveryTile from "@/components/discovery/DiscoveryTile";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, Target } from "lucide-react";

type ProjectCard = {
  id: string;
  owner: string;
  sector: string;
  raised: string;
  prog: number;
  min: string;
  ret: string;
  risk: "conservative" | "moderate" | "aggressive";
  ver: boolean;
};

const PROJECTS: ProjectCard[] = [
  {
    id: "masuwe",
    owner: "Mosi Oa Tunya Development Company",
    sector: "tourism",
    raised: "$0",
    prog: 10,
    min: "$10k",
    ret: "14-20%",
    risk: "moderate",
    ver: true,
  },
  {
    id: "leather",
    owner: "Linkdef Soap Manufacturing (Pvt) Ltd",
    sector: "manufacturing",
    raised: "$0",
    prog: 35,
    min: "$500",
    ret: "12-16%",
    risk: "moderate",
    ver: true,
  },
  {
    id: "apparel",
    owner: "National Railways of Zimbabwe",
    sector: "manufacturing",
    raised: "$0",
    prog: 20,
    min: "$1k",
    ret: "16-22%",
    risk: "aggressive",
    ver: true,
  },
  {
    id: "horticulture",
    owner: "Cicada Group",
    sector: "agriculture",
    raised: "$0",
    prog: 40,
    min: "$300",
    ret: "10-14%",
    risk: "conservative",
    ver: true,
  },
  {
    id: "fintech",
    owner: "Powertel Communications (Pvt) Ltd",
    sector: "it",
    raised: "$0",
    prog: 15,
    min: "$2,500",
    ret: "22-30%",
    risk: "aggressive",
    ver: true,
  },
  {
    id: "solar",
    owner: "Solgas Energy Pvt Ltd",
    sector: "energy",
    raised: "$0",
    prog: 12,
    min: "$1,000",
    ret: "14-18%",
    risk: "conservative",
    ver: true,
  },
  {
    id: "beef_dairy",
    owner: "Agro Strong (Pvt) Ltd",
    sector: "agriculture",
    raised: "$0",
    prog: 18,
    min: "$750",
    ret: "13-18%",
    risk: "moderate",
    ver: true,
  },
  {
    id: "agro_park",
    owner: "Goromonzi Agro Industrial Company (GAIC)",
    sector: "agriculture",
    raised: "$0",
    prog: 14,
    min: "$1,500",
    ret: "15-22%",
    risk: "moderate",
    ver: true,
  },
  {
    id: "data_centres",
    owner: "TelOne (Pvt) Ltd",
    sector: "it",
    raised: "$0",
    prog: 9,
    min: "$2,000",
    ret: "18-26%",
    risk: "aggressive",
    ver: true,
  },
  {
    id: "vaccine",
    owner: "SIRDC",
    sector: "manufacturing",
    raised: "$0",
    prog: 11,
    min: "$1,250",
    ret: "12-17%",
    risk: "moderate",
    ver: true,
  },
  {
    id: "roof_tiles",
    owner: "Orangerose Investments",
    sector: "manufacturing",
    raised: "$0",
    prog: 16,
    min: "$1,000",
    ret: "14-19%",
    risk: "moderate",
    ver: true,
  },
  {
    id: "radco_solar",
    owner: "RADCO Holdings",
    sector: "energy",
    raised: "$0",
    prog: 8,
    min: "$2,500",
    ret: "13-18%",
    risk: "conservative",
    ver: true,
  },
];

const PROJECT_FILTER_FALLBACKS: Record<string, string> = {
  all: "All",
  tourism: "Tourism",
  agriculture: "Agriculture",
  manufacturing: "Manufacturing",
  it: "Technology",
  energy: "Energy",
  conservative: "Conservative",
  moderate: "Moderate",
  aggressive: "Aggressive",
};

const PROJECT_CONTENT_FALLBACKS: Record<
  string,
  { title: string; description: string; highlights: string[] }
> = {
  masuwe: {
    title: "Masuwe SEZ Construction of Villas Project",
    description:
      "Tourism-linked hospitality infrastructure opportunity in the Victoria Falls growth corridor.",
    highlights: ["SEZ Corridor", "Hospitality Assets", "Tourism Demand"],
  },
  leather: {
    title: "Linkdef Soap Manufacturing Project",
    description:
      "State-of-the-art soap and detergent manufacturing facility aligned to Zimbabwe's industrialization strategy.",
    highlights: ["Import Substitution", "Consumer Goods", "Manufacturing Jobs"],
  },
  apparel: {
    title: "NRZ Concrete Manufacturing Plant Project",
    description:
      "Concrete sleeper manufacturing to support rail infrastructure renewal and domestic industrial supply.",
    highlights: [
      "Infrastructure Supply",
      "Industrial Demand",
      "Rail Modernization",
    ],
  },
  horticulture: {
    title: "CICADA Macadamia and Avocado Plantation",
    description:
      "High-value agriculture and value-addition platform for avocado and macadamia export markets.",
    highlights: ["Export Agriculture", "Value Addition", "Regional Processing"],
  },
  fintech: {
    title: "Powertel Fibre Internet (GPON)",
    description:
      "Fibre broadband infrastructure rollout to improve national digital access and enterprise connectivity.",
    highlights: [
      "Broadband Expansion",
      "ICT Infrastructure",
      "Digital Inclusion",
    ],
  },
  solar: {
    title: "Solgas Energy 60MW Solar PV Plant + BESS",
    description:
      "Utility-scale renewable energy project combining solar generation with battery storage capacity.",
    highlights: ["60MW Solar", "Battery Storage", "Grid Support"],
  },
  beef_dairy: {
    title: "Agro Strong Beef and Dairy Farming Venture",
    description:
      "Integrated livestock project designed to strengthen domestic protein supply and value-added dairy processing.",
    highlights: ["Livestock Scale-Up", "Dairy Value Addition", "Food Security"],
  },
  agro_park: {
    title: "Goromonzi Agro Processing Industrial Park (SEZ)",
    description:
      "Specialized agro-processing cluster targeting export-ready outputs, storage logistics, and value-chain efficiency.",
    highlights: ["Agro Processing", "SEZ Cluster", "Export Readiness"],
  },
  data_centres: {
    title: "TelOne Data Centres Project",
    description:
      "Enterprise-grade data centre capacity expansion for cloud workloads, hosting, and digital public infrastructure.",
    highlights: ["Data Hosting", "Cloud Capacity", "Digital Backbone"],
  },
  vaccine: {
    title: "Foot and Mouth Disease Vaccine Manufacturing Project",
    description:
      "Strategic pharmaceutical manufacturing initiative to localize vaccine production and reduce import dependence.",
    highlights: [
      "Biotech Production",
      "Import Substitution",
      "Veterinary Health",
    ],
  },
  roof_tiles: {
    title: "Orangerose Solar Roof Tile Manufacturing Project",
    description:
      "Local clean-tech manufacturing project for solar roof tiles aligned to distributed energy adoption.",
    highlights: ["Solar Materials", "Local Manufacturing", "Clean Energy"],
  },
  radco_solar: {
    title: "RADCO Solar and Smart City Project",
    description:
      "Large-scale clean energy and smart infrastructure platform supporting sustainable urban and industrial growth.",
    highlights: ["Smart City", "Grid-Scale Solar", "Energy Transition"],
  },
};

export default function InvestmentOpportunitiesPage() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  const filtered = useMemo(
    () =>
      PROJECTS.filter(
        p =>
          (activeFilter === "all" || p.sector === activeFilter) &&
          (riskFilter === "all" || p.risk === riskFilter)
      ),
    [activeFilter, riskFilter]
  );

  const getProjectText = (
    projectId: string,
    field: "title" | "description",
    fallback: string
  ) => {
    const key = `investment.projects.${projectId}.${field}`;
    const translated = t(key);
    if (
      typeof translated !== "string" ||
      translated.trim().length === 0 ||
      translated === key
    ) {
      return fallback;
    }
    return translated;
  };

  return (
    <Layout>
      <section className="document-section discovery-section discovery-listing min-h-screen relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto space-y-6">
          <Link
            href="/investment"
            className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("investment.back_to_investment", {
              defaultValue: "Back to Investment",
            })}
          </Link>

          <div className="content-panel editorial-panel p-8 md:p-10">
            <div className="section-heading mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Target className="h-6 w-6 text-zim-gold" />
                <h1 className="page-title discovery-page-title">
                  {t("investment.sectors_title") ||
                    "Active Investment Opportunities"}
                </h1>
              </div>
              <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">
                {t("investment.sectors_subtitle") ||
                  "Carefully vetted projects with government support and transparent tracking."}
              </p>
              <div className="flex flex-wrap gap-2 mt-8">
                {[
                  "all",
                  "tourism",
                  "agriculture",
                  "manufacturing",
                  "it",
                  "energy",
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => setActiveFilter(s)}
                    className={`filter-control px-4 py-2 border ${
                      activeFilter === s
                        ? "bg-zim-gold text-zim-black border-zim-gold shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                        : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"
                    }`}
                  >
                    {t(`investment.project_filters.${s}`) ||
                      PROJECT_FILTER_FALLBACKS[s] ||
                      s}
                  </button>
                ))}
                <div className="relative min-w-[210px]">
                  <label htmlFor="risk-level-filter" className="sr-only">
                    {t("investment.project_card.risk") || "Risk Level"}
                  </label>
                  <select
                    id="risk-level-filter"
                    value={riskFilter}
                    onChange={e => setRiskFilter(e.target.value)}
                    className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white outline-none transition-all focus:border-zim-gold"
                  >
                    {["all", "conservative", "moderate", "aggressive"].map(
                      risk => (
                        <option key={risk} value={risk} className="text-black">
                          {t("investment.project_card.risk") || "Risk Level"}:{" "}
                          {t(`investment.project_filters.${risk}`) ||
                            PROJECT_FILTER_FALLBACKS[risk] ||
                            risk}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                <Target className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  {t("investment.no_results", {
                    defaultValue: "No projects match your current filters.",
                  })}
                </p>
                <button
                  onClick={() => {
                    setActiveFilter("all");
                    setRiskFilter("all");
                  }}
                  className="filter-control underline underline-offset-4 text-amber-800"
                >
                  {t("investment.clear_filters", {
                    defaultValue: "Clear filters",
                  })}
                </button>
              </div>
            ) : null}

            <SwipeRail
              label={t("investment.sectors_title", {
                defaultValue: "Active Investment Opportunities",
              })}
              resetKey={`${activeFilter}:${riskFilter}`}
            >
              {filtered.map(p => (
                <DiscoveryTile
                  key={p.id}
                  headingLevel={2}
                  title={getProjectText(
                    p.id,
                    "title",
                    PROJECT_CONTENT_FALLBACKS[p.id]?.title ||
                      "Investment Opportunity"
                  )}
                  icon={Target}
                  footer={
                    <Button
                      asChild
                      className="w-full bg-white text-slate-950 hover:bg-slate-200"
                    >
                      <Link href={`/investment/projects/${p.id}`}>
                        {t("investment.project_card.view_details", {
                          defaultValue: "View Details",
                        })}
                      </Link>
                    </Button>
                  }
                >
                  <div className="mb-4 flex items-center gap-2">
                    <Badge
                      className={`text-xs ${p.risk === "conservative" ? "bg-emerald-500/15 text-emerald-300" : p.risk === "moderate" ? "bg-yellow-500/15 text-yellow-200" : "bg-rose-500/15 text-rose-300"}`}
                    >
                      {t(`investment.project_filters.${p.risk}`) ||
                        PROJECT_FILTER_FALLBACKS[p.risk] ||
                        p.risk}{" "}
                      {t("investment.project_card.risk", {
                        defaultValue: "Risk Level",
                      })}
                    </Badge>
                    {p.ver && (
                      <Award
                        className="h-4 w-4 text-sky-300"
                        aria-label={t("investment.project_card.verified", {
                          defaultValue: "Verified Asset",
                        })}
                      />
                    )}
                  </div>
                  <p>
                    {getProjectText(
                      p.id,
                      "description",
                      PROJECT_CONTENT_FALLBACKS[p.id]?.description ||
                        "Verified opportunity for diaspora investors."
                    )}
                  </p>
                  <p className="mt-3">
                    {t("investment.project_card.owner", {
                      defaultValue: "Responsible Company",
                    })}
                    : {p.owner}
                  </p>
                  <ul className="mt-4 list-disc space-y-1 pl-4">
                    {(
                      (Array.isArray(
                        t(`investment.projects.${p.id}.highlights`, {
                          returnObjects: true,
                        })
                      )
                        ? (t(`investment.projects.${p.id}.highlights`, {
                            returnObjects: true,
                          }) as string[])
                        : PROJECT_CONTENT_FALLBACKS[p.id]?.highlights) || []
                    ).map(h => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between gap-3 text-xs text-slate-300">
                      <span>
                        {t("investment.project_card.raised", {
                          amount: p.raised,
                          defaultValue: `Raised: ${p.raised}`,
                        })}
                      </span>
                      <span>{p.prog}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`${p.prog}% funded`}
                      aria-valuenow={p.prog}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-1.5 overflow-hidden rounded-full bg-white/10"
                    >
                      <div
                        className="h-full bg-zim-gold"
                        style={{ width: `${p.prog}%` }}
                      />
                    </div>
                  </div>
                  <dl className="discovery-project-metrics">
                    <div>
                      <dt>
                        {t("investment.project_filters.min_investment", {
                          defaultValue: "Min.",
                        })}
                      </dt>
                      <dd>{p.min}</dd>
                    </div>
                    <div>
                      <dt>
                        {t("investment.project_filters.expected_return", {
                          defaultValue: "Expected",
                        })}
                      </dt>
                      <dd>{p.ret}</dd>
                    </div>
                  </dl>
                </DiscoveryTile>
              ))}
            </SwipeRail>
          </div>
        </div>
      </section>
    </Layout>
  );
}
