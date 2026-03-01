import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, CheckCircle, Target } from "lucide-react";

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
  { id: "masuwe", owner: "Mosi Oa Tunya Development Company", sector: "tourism", raised: "$0", prog: 10, min: "$10k", ret: "14-20%", risk: "moderate", ver: true },
  { id: "leather", owner: "Linkdef Soap Manufacturing (Pvt) Ltd", sector: "manufacturing", raised: "$0", prog: 35, min: "$500", ret: "12-16%", risk: "moderate", ver: true },
  { id: "apparel", owner: "National Railways of Zimbabwe", sector: "manufacturing", raised: "$0", prog: 20, min: "$1k", ret: "16-22%", risk: "aggressive", ver: true },
  { id: "horticulture", owner: "Cicada Group", sector: "agriculture", raised: "$0", prog: 40, min: "$300", ret: "10-14%", risk: "conservative", ver: true },
  { id: "fintech", owner: "Powertel Communications (Pvt) Ltd", sector: "it", raised: "$0", prog: 15, min: "$2,500", ret: "22-30%", risk: "aggressive", ver: true },
  { id: "solar", owner: "Solgas Energy Pvt Ltd", sector: "energy", raised: "$0", prog: 12, min: "$1,000", ret: "14-18%", risk: "conservative", ver: true },
  { id: "beef_dairy", owner: "Agro Strong (Pvt) Ltd", sector: "agriculture", raised: "$0", prog: 18, min: "$750", ret: "13-18%", risk: "moderate", ver: true },
  { id: "agro_park", owner: "Goromonzi Agro Industrial Company (GAIC)", sector: "agriculture", raised: "$0", prog: 14, min: "$1,500", ret: "15-22%", risk: "moderate", ver: true },
  { id: "data_centres", owner: "TelOne (Pvt) Ltd", sector: "it", raised: "$0", prog: 9, min: "$2,000", ret: "18-26%", risk: "aggressive", ver: true },
  { id: "vaccine", owner: "SIRDC", sector: "manufacturing", raised: "$0", prog: 11, min: "$1,250", ret: "12-17%", risk: "moderate", ver: true },
  { id: "roof_tiles", owner: "Orangerose Investments", sector: "manufacturing", raised: "$0", prog: 16, min: "$1,000", ret: "14-19%", risk: "moderate", ver: true },
  { id: "radco_solar", owner: "RADCO Holdings", sector: "energy", raised: "$0", prog: 8, min: "$2,500", ret: "13-18%", risk: "conservative", ver: true },
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

const PROJECT_CONTENT_FALLBACKS: Record<string, { title: string; description: string; highlights: string[] }> = {
  masuwe: { title: "Masuwe SEZ Construction of Villas Project", description: "Tourism-linked hospitality infrastructure opportunity in the Victoria Falls growth corridor.", highlights: ["SEZ Corridor", "Hospitality Assets", "Tourism Demand"] },
  leather: { title: "Linkdef Soap Manufacturing Project", description: "State-of-the-art soap and detergent manufacturing facility aligned to Zimbabwe's industrialization strategy.", highlights: ["Import Substitution", "Consumer Goods", "Manufacturing Jobs"] },
  apparel: { title: "NRZ Concrete Manufacturing Plant Project", description: "Concrete sleeper manufacturing to support rail infrastructure renewal and domestic industrial supply.", highlights: ["Infrastructure Supply", "Industrial Demand", "Rail Modernization"] },
  horticulture: { title: "CICADA Macadamia and Avocado Plantation", description: "High-value agriculture and value-addition platform for avocado and macadamia export markets.", highlights: ["Export Agriculture", "Value Addition", "Regional Processing"] },
  fintech: { title: "Powertel Fibre Internet (GPON)", description: "Fibre broadband infrastructure rollout to improve national digital access and enterprise connectivity.", highlights: ["Broadband Expansion", "ICT Infrastructure", "Digital Inclusion"] },
  solar: { title: "Solgas Energy 60MW Solar PV Plant + BESS", description: "Utility-scale renewable energy project combining solar generation with battery storage capacity.", highlights: ["60MW Solar", "Battery Storage", "Grid Support"] },
  beef_dairy: { title: "Agro Strong Beef and Dairy Farming Venture", description: "Integrated livestock project designed to strengthen domestic protein supply and value-added dairy processing.", highlights: ["Livestock Scale-Up", "Dairy Value Addition", "Food Security"] },
  agro_park: { title: "Goromonzi Agro Processing Industrial Park (SEZ)", description: "Specialized agro-processing cluster targeting export-ready outputs, storage logistics, and value-chain efficiency.", highlights: ["Agro Processing", "SEZ Cluster", "Export Readiness"] },
  data_centres: { title: "TelOne Data Centres Project", description: "Enterprise-grade data centre capacity expansion for cloud workloads, hosting, and digital public infrastructure.", highlights: ["Data Hosting", "Cloud Capacity", "Digital Backbone"] },
  vaccine: { title: "Foot and Mouth Disease Vaccine Manufacturing Project", description: "Strategic pharmaceutical manufacturing initiative to localize vaccine production and reduce import dependence.", highlights: ["Biotech Production", "Import Substitution", "Veterinary Health"] },
  roof_tiles: { title: "Orangerose Solar Roof Tile Manufacturing Project", description: "Local clean-tech manufacturing project for solar roof tiles aligned to distributed energy adoption.", highlights: ["Solar Materials", "Local Manufacturing", "Clean Energy"] },
  radco_solar: { title: "RADCO Solar and Smart City Project", description: "Large-scale clean energy and smart infrastructure platform supporting sustainable urban and industrial growth.", highlights: ["Smart City", "Grid-Scale Solar", "Energy Transition"] },
};

export default function InvestmentOpportunitiesPage() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  const filtered = useMemo(
    () => PROJECTS.filter((p) => (activeFilter === "all" || p.sector === activeFilter) && (riskFilter === "all" || p.risk === riskFilter)),
    [activeFilter, riskFilter]
  );

  const getProjectText = (projectId: string, field: "title" | "description", fallback: string) => {
    const key = `investment.projects.${projectId}.${field}`;
    const translated = t(key);
    if (typeof translated !== "string" || translated.trim().length === 0 || translated === key) {
      return fallback;
    }
    return translated;
  };

  return (
    <Layout>
      <section className="min-h-screen p-5 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto space-y-6">
          <Link href="/investment" className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-white/70 hover:text-zim-gold">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("investment.back_to_investment", { defaultValue: "Back to Investment" })}
          </Link>

          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <Target className="h-6 w-6 text-zim-gold" />
                <h1 className="text-xl font-black text-white tracking-tight">{t("investment.sectors_title") || "Active Investment Opportunities"}</h1>
              </div>
              <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">
                {t("investment.sectors_subtitle") || "Carefully vetted projects with government support and transparent tracking."}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-8">
                {["all", "tourism", "agriculture", "manufacturing", "it", "energy"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveFilter(s)}
                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                      activeFilter === s
                        ? "bg-zim-gold text-zim-black border-zim-gold shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                        : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
                    }`}
                  >
                    {t(`investment.project_filters.${s}`) || PROJECT_FILTER_FALLBACKS[s] || s}
                  </button>
                ))}
                {["all", "conservative", "moderate", "aggressive"].map((risk) => (
                  <button
                    key={risk}
                    onClick={() => setRiskFilter(risk)}
                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                      riskFilter === risk
                        ? "bg-zim-gold text-zim-black border-zim-gold shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                        : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
                    }`}
                  >
                    {t(`investment.project_filters.${risk}`) || PROJECT_FILTER_FALLBACKS[risk] || risk}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {filtered.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="group rounded-[2rem] border border-white/10 bg-white/[0.02] transition-colors duration-300 hover:bg-white/[0.03]"
                >
                  <div className="grid md:grid-cols-12 gap-6 p-7">
                    <div className="md:col-span-8 space-y-5">
                      <div className="flex flex-wrap gap-2">
                        <Badge className={`text-[9px] uppercase font-black px-3 py-1 rounded-full ${p.risk === "conservative" ? "bg-green-500/10 text-green-400" : p.risk === "moderate" ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400"}`}>
                          {(t(`investment.project_filters.${p.risk}`) || PROJECT_FILTER_FALLBACKS[p.risk] || p.risk)} {t("investment.project_card.risk") || "Risk Level"}
                        </Badge>
                        {p.ver ? (
                          <div className="group/verified relative">
                            <Badge
                              title={t("investment.project_card.verified") || "Verified Asset"}
                              aria-label={t("investment.project_card.verified") || "Verified Asset"}
                              className="h-6 w-6 justify-center rounded-full border border-blue-500/20 bg-blue-500/10 p-0 text-blue-400"
                            >
                              <Award className="h-3 w-3" />
                            </Badge>
                          </div>
                        ) : null}
                      </div>

                      <h3 className="text-lg font-black text-white tracking-tight">
                        {getProjectText(p.id, "title", PROJECT_CONTENT_FALLBACKS[p.id]?.title || "Investment Opportunity")}
                      </h3>
                      <p className="text-sm text-white/50 font-light leading-relaxed line-clamp-2">
                        {getProjectText(p.id, "description", PROJECT_CONTENT_FALLBACKS[p.id]?.description || "Verified opportunity for diaspora investors.")}
                      </p>
                      <p className="text-[11px] text-white/60 font-semibold uppercase tracking-wider">
                        {t("investment.project_card.owner", { defaultValue: "Responsible Company" })}: {p.owner}
                      </p>

                      <ul className="grid sm:grid-cols-2 gap-3">
                        {((Array.isArray(t(`investment.projects.${p.id}.highlights`, { returnObjects: true }))
                          ? (t(`investment.projects.${p.id}.highlights`, { returnObjects: true }) as string[])
                          : PROJECT_CONTENT_FALLBACKS[p.id]?.highlights) || []).map((h, i) => (
                          <li key={`${p.id}-${i}`} className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider text-white/70">
                            <CheckCircle className="h-4 w-4 text-zim-gold opacity-60" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="md:col-span-4 p-2 flex flex-col justify-between border-l border-white/10 md:pl-5">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                            <span>{t("investment.project_card.raised", { amount: p.raised }) || `Raised: ${p.raised}`}</span>
                            <span className="text-zim-gold">{p.prog}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${p.prog}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="h-full bg-zim-gold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <div className="py-2 border-b border-white/10">
                            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">{t("investment.project_filters.min_investment") || "Min."}</p>
                            <p className="text-sm font-black text-white">{p.min}</p>
                          </div>
                          <div className="py-2">
                            <p className="text-[9px] font-black text-zim-gold/40 uppercase tracking-widest">{t("investment.project_filters.expected_return") || "Expected"}</p>
                            <p className="text-sm font-black text-zim-gold">{p.ret}</p>
                          </div>
                        </div>
                      </div>

                      <Link href={`/investment/projects/${p.id}`}>
                        <Button
                          variant="outline"
                          className="w-full mt-4 rounded-full border border-white/25 bg-white/10 backdrop-blur-md text-white hover:bg-white hover:text-zim-black hover:border-white font-black uppercase tracking-widest text-[10px] transition-all duration-300"
                        >
                          {t("investment.project_card.view_details") || "View Details"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
