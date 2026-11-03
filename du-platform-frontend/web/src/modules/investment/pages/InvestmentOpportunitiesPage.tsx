import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import SwipeRail from "@/components/discovery/SwipeRail";
import DiscoveryTile from "@/components/discovery/DiscoveryTile";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CircleHelp, Target } from "lucide-react";

// Keep the existing catalogue groups for filter continuity, without presenting them as risk assessments.
type ProjectCard = {
  id: string;
  owner: string;
  sector: string;
  risk: "conservative" | "moderate" | "aggressive";
};

const PROJECTS: ProjectCard[] = [
  {
    id: "masuwe",
    owner: "Mosi Oa Tunya Development Company",
    sector: "tourism",
    risk: "moderate",
  },
  {
    id: "leather",
    owner: "Linkdef Soap Manufacturing (Pvt) Ltd",
    sector: "manufacturing",
    risk: "moderate",
  },
  {
    id: "apparel",
    owner: "National Railways of Zimbabwe",
    sector: "manufacturing",
    risk: "aggressive",
  },
  {
    id: "horticulture",
    owner: "Cicada Group",
    sector: "agriculture",
    risk: "conservative",
  },
  {
    id: "fintech",
    owner: "Powertel Communications (Pvt) Ltd",
    sector: "it",
    risk: "aggressive",
  },
  {
    id: "solar",
    owner: "Solgas Energy Pvt Ltd",
    sector: "energy",
    risk: "conservative",
  },
  {
    id: "beef_dairy",
    owner: "Agro Strong (Pvt) Ltd",
    sector: "agriculture",
    risk: "moderate",
  },
  {
    id: "agro_park",
    owner: "Goromonzi Agro Industrial Company (GAIC)",
    sector: "agriculture",
    risk: "moderate",
  },
  {
    id: "data_centres",
    owner: "TelOne (Pvt) Ltd",
    sector: "it",
    risk: "aggressive",
  },
  {
    id: "vaccine",
    owner: "SIRDC",
    sector: "manufacturing",
    risk: "moderate",
  },
  {
    id: "roof_tiles",
    owner: "Orangerose Investments",
    sector: "manufacturing",
    risk: "moderate",
  },
  {
    id: "radco_solar",
    owner: "RADCO Holdings",
    sector: "energy",
    risk: "conservative",
  },
];

const PROJECT_FILTER_FALLBACKS: Record<string, string> = {
  all: "All",
  tourism: "Tourism",
  agriculture: "Agriculture",
  manufacturing: "Manufacturing",
  it: "Technology",
  energy: "Energy",
  conservative: "Group A",
  moderate: "Group B",
  aggressive: "Group C",
};

const PROJECT_CONTENT_FALLBACKS: Record<
  string,
  { title: string; description: string; highlights: string[] }
> = {
  masuwe: {
    title: "Masuwe SEZ Construction of Villas Project",
    description:
      "Profile of a proposed tourism and hospitality development in the Victoria Falls area.",
    highlights: ["SEZ Corridor", "Hospitality Assets", "Tourism Demand"],
  },
  leather: {
    title: "Linkdef Soap Manufacturing Project",
    description:
      "Profile of a proposed soap and detergent manufacturing project.",
    highlights: ["Import Substitution", "Consumer Goods", "Manufacturing Jobs"],
  },
  apparel: {
    title: "NRZ Concrete Manufacturing Plant Project",
    description:
      "Profile of a concrete sleeper manufacturing proposal for rail infrastructure.",
    highlights: [
      "Infrastructure Supply",
      "Industrial Demand",
      "Rail Modernization",
    ],
  },
  horticulture: {
    title: "CICADA Macadamia and Avocado Plantation",
    description:
      "Profile of an avocado and macadamia agriculture and processing proposal.",
    highlights: ["Export Agriculture", "Value Addition", "Regional Processing"],
  },
  fintech: {
    title: "Powertel Fibre Internet (GPON)",
    description:
      "Profile of a fibre broadband expansion proposal. Confirm routes, scope and current project status with the promoter.",
    highlights: [
      "Broadband Expansion",
      "ICT Infrastructure",
      "Digital Inclusion",
    ],
  },
  solar: {
    title: "Solgas Energy Solar PV Plant + BESS",
    description:
      "Profile of a solar generation and battery storage proposal. Capacity, approvals and financing need confirmation.",
    highlights: ["Solar generation", "Battery Storage", "Grid Support"],
  },
  beef_dairy: {
    title: "Agro Strong Beef and Dairy Farming Venture",
    description:
      "Profile of a proposed livestock and dairy project, including production and processing themes.",
    highlights: ["Livestock Scale-Up", "Dairy Value Addition", "Food Security"],
  },
  agro_park: {
    title: "Goromonzi Agro Processing Industrial Park (SEZ)",
    description:
      "Profile of an agro-processing park proposal in Mashonaland East. Check the current site and project scope.",
    highlights: ["Agro Processing", "SEZ Cluster", "Export Readiness"],
  },
  data_centres: {
    title: "TelOne Data Centres Project",
    description:
      "Profile of a data centre expansion proposal for hosting and digital infrastructure.",
    highlights: ["Data Hosting", "Cloud Capacity", "Digital Backbone"],
  },
  vaccine: {
    title: "Foot and Mouth Disease Vaccine Manufacturing Project",
    description:
      "Profile of a veterinary vaccine manufacturing proposal. Confirm technical scope, approvals and current plans.",
    highlights: [
      "Biotech Production",
      "Import Substitution",
      "Veterinary Health",
    ],
  },
  roof_tiles: {
    title: "Orangerose Solar Roof Tile Manufacturing Project",
    description:
      "Profile of a solar roof tile manufacturing proposal for buildings.",
    highlights: ["Solar Materials", "Local Manufacturing", "Clean Energy"],
  },
  radco_solar: {
    title: "RADCO Solar and Smart City Project",
    description:
      "Profile of a solar and urban infrastructure proposal. Confirm the current scope and participation terms with the promoter.",
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
                  {t("investment.sectors_title") || "Explore project profiles"}
                </h1>
              </div>
              <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">
                {t("investment.sectors_subtitle") ||
                  "Read project descriptions and listed promoter details by sector. These profiles support research; DU does not accept investments or confirm participation terms."}
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
                    {t("investment.project_card.risk") || "Catalogue group"}
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
                          {t("investment.project_card.risk") ||
                            "Catalogue group"}
                          :{" "}
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
                defaultValue: "Explore project profiles",
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
                      className="w-full bg-zim-gold text-slate-950 hover:bg-yellow-300"
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
                    <Badge className="text-xs bg-slate-500/15 text-slate-300">
                      {t("investment.project_card.risk_unassessed", {
                        defaultValue: "Risk not assessed",
                      })}
                    </Badge>
                    <CircleHelp
                      className="h-4 w-4 shrink-0 text-slate-400"
                      aria-label={t("investment.project_card.verified", {
                        defaultValue: "Not independently verified",
                      })}
                    />
                  </div>
                  <p>
                    {getProjectText(
                      p.id,
                      "description",
                      PROJECT_CONTENT_FALLBACKS[p.id]?.description ||
                        "Project profile for further research."
                    )}
                  </p>
                  <p className="mt-3">
                    {t("investment.project_card.owner", {
                      defaultValue: "Listed promoter",
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
                          defaultValue: "Funding data unavailable",
                        })}
                      </span>
                      <span aria-hidden="true">—</span>
                    </div>
                    <div
                      role="img"
                      aria-label={t("investment.project_card.raised", {
                        defaultValue: "Funding data unavailable",
                      })}
                      className="h-1.5 overflow-hidden rounded-full bg-white/10"
                    >
                      <div className="h-full bg-zim-gold w-0" />
                    </div>
                  </div>
                  <dl className="discovery-project-metrics">
                    <div>
                      <dt>
                        {t("investment.project_filters.min_investment", {
                          defaultValue: "Minimum contribution",
                        })}
                      </dt>
                      <dd>
                        {t("investment.project_card.unavailable", {
                          defaultValue: "Not published",
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {t("investment.project_filters.expected_return", {
                          defaultValue: "Return information",
                        })}
                      </dt>
                      <dd>
                        {t("investment.project_card.unavailable", {
                          defaultValue: "Not published",
                        })}
                      </dd>
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
