import ResearchHandoff from "../components/ResearchHandoff";
import Layout from "@/components/Layout";
import investmentProjectRoutes from "@/contracts/investmentProjectRoutes.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CircleHelp,
  MapPin,
  Ruler,
  Landmark,
  Building2,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { useTranslation } from "react-i18next";

type ProjectDetails = {
  title: string;
  subtitle: string;
  owner: string;
  overview: string;
  highlights: string[];
  stats: Array<{ label: string; value: string }>;
  location: string;
  framework: string;
  regulatory: string;
};

const STAT_LABEL_KEYS: Record<string, string> = {
  Target: "target",
  "Total SEZ Area": "area",
  "Phase 1": "phase1",
  "Phase 2": "phase2",
  "Golf Course": "golf",
  "Holiday Homes": "homes",
  "IFSC Site": "ifsc",
};

const PROJECTS: Record<string, ProjectDetails> = {
  masuwe: {
    title: investmentProjectRoutes.masuwe,
    subtitle: "Tourism Infrastructure Opportunity near Victoria Falls",
    owner: "Mosi Oa Tunya Development Company",
    overview:
      "Project information for research. Confirm the promoter, scope, approvals and any investment terms independently before proceeding.",
    highlights: [
      "What is the proposed scope and current timetable?",
      "Which costs and participation terms are documented?",
      "Which ownership records and approvals can be checked independently?",
      "What land is included in each proposed phase?",
      "Are current surveys and site plans available?",
      "What agreements support the proposed sports facilities?",
      "What is the status of the golf and accommodation plans?",
      "Which hotel and conference sites are currently proposed?",
      "What approvals would any medical tourism facilities need?",
      "What is the current status of the financial services site?",
    ],
    stats: [
      { label: "Total SEZ Area", value: "Not independently verified" },
      { label: "Phase 1", value: "Not independently verified" },
      { label: "Phase 2", value: "Not independently verified" },
      { label: "Golf Course", value: "Not independently verified" },
      { label: "Holiday Homes", value: "Not independently verified" },
      { label: "IFSC Site", value: "Not independently verified" },
    ],
    location: "Matabeleland North (Victoria Falls Corridor)",
    framework: "Request the current project scope and supporting documents.",
    regulatory:
      "Confirm current approvals with the promoter and relevant authorities.",
  },
  leather: {
    title: investmentProjectRoutes.leather,
    subtitle: "Consumer Goods Manufacturing Expansion",
    owner: "Linkdef Soap Manufacturing (Pvt) Ltd",
    overview:
      "Project information for research. Confirm the promoter, scope, approvals and any investment terms independently before proceeding.",
    highlights: [
      "What is the proposed scope and current timetable?",
      "Which costs and participation terms are documented?",
      "Which ownership records and approvals can be checked independently?",
    ],
    stats: [{ label: "Target", value: "Not published" }],
    location: "Harare",
    framework: "Request the current project scope and supporting documents.",
    regulatory:
      "Confirm current approvals with the promoter and relevant authorities.",
  },
  apparel: {
    title: investmentProjectRoutes.apparel,
    subtitle: "Rail Infrastructure Supply Chain Investment",
    owner: "National Railways of Zimbabwe",
    overview:
      "Project information for research. Confirm the promoter, scope, approvals and any investment terms independently before proceeding.",
    highlights: [
      "What is the proposed scope and current timetable?",
      "Which costs and participation terms are documented?",
      "Which ownership records and approvals can be checked independently?",
    ],
    stats: [{ label: "Target", value: "Not published" }],
    location: "Bulawayo",
    framework: "Request the current project scope and supporting documents.",
    regulatory:
      "Confirm current approvals with the promoter and relevant authorities.",
  },
  horticulture: {
    title: investmentProjectRoutes.horticulture,
    subtitle: "High-Value Crop and Export Processing Platform",
    owner: "Cicada Group",
    overview:
      "Project information for research. Confirm the promoter, scope, approvals and any investment terms independently before proceeding.",
    highlights: [
      "What is the proposed scope and current timetable?",
      "Which costs and participation terms are documented?",
      "Which ownership records and approvals can be checked independently?",
    ],
    stats: [{ label: "Target", value: "Not published" }],
    location: "Midlands / Manicaland",
    framework: "Request the current project scope and supporting documents.",
    regulatory:
      "Confirm current approvals with the promoter and relevant authorities.",
  },
  fintech: {
    title: investmentProjectRoutes.fintech,
    subtitle: "National Broadband Infrastructure Rollout",
    owner: "Powertel Communications (Pvt) Ltd",
    overview:
      "Project information for research. Confirm the promoter, scope, approvals and any investment terms independently before proceeding.",
    highlights: [
      "What is the proposed scope and current timetable?",
      "Which costs and participation terms are documented?",
      "Which ownership records and approvals can be checked independently?",
    ],
    stats: [{ label: "Target", value: "Not published" }],
    location: "Harare (national expansion scope)",
    framework: "Request the current project scope and supporting documents.",
    regulatory:
      "Confirm current approvals with the promoter and relevant authorities.",
  },
  solar: {
    title: investmentProjectRoutes.solar,
    subtitle: "Utility-Scale Renewable Energy Deployment",
    owner: "Solgas Energy Pvt Ltd",
    overview:
      "Project information for research. Confirm the promoter, scope, approvals and any investment terms independently before proceeding.",
    highlights: [
      "What is the proposed scope and current timetable?",
      "Which costs and participation terms are documented?",
      "Which ownership records and approvals can be checked independently?",
    ],
    stats: [{ label: "Target", value: "Not published" }],
    location: "Matabeleland North",
    framework: "Request the current project scope and supporting documents.",
    regulatory:
      "Confirm current approvals with the promoter and relevant authorities.",
  },
  beef_dairy: {
    title: investmentProjectRoutes.beef_dairy,
    subtitle: "Livestock and Dairy Value Chain Expansion",
    owner: "Agro Strong (Pvt) Ltd",
    overview:
      "Project information for research. Confirm the promoter, scope, approvals and any investment terms independently before proceeding.",
    highlights: [
      "What is the proposed scope and current timetable?",
      "Which costs and participation terms are documented?",
      "Which ownership records and approvals can be checked independently?",
    ],
    stats: [{ label: "Target", value: "Not published" }],
    location: "Matabeleland South",
    framework: "Request the current project scope and supporting documents.",
    regulatory:
      "Confirm current approvals with the promoter and relevant authorities.",
  },
  agro_park: {
    title: investmentProjectRoutes.agro_park,
    subtitle: "Agro-Industrial Cluster Development",
    owner: "Goromonzi Agro Industrial Company (GAIC)",
    overview:
      "Project information for research. Confirm the promoter, scope, approvals and any investment terms independently before proceeding.",
    highlights: [
      "What is the proposed scope and current timetable?",
      "Which costs and participation terms are documented?",
      "Which ownership records and approvals can be checked independently?",
    ],
    stats: [{ label: "Target", value: "Not published" }],
    location: "Mashonaland East",
    framework: "Request the current project scope and supporting documents.",
    regulatory:
      "Confirm current approvals with the promoter and relevant authorities.",
  },
  data_centres: {
    title: investmentProjectRoutes.data_centres,
    subtitle: "Digital Infrastructure and Hosting Expansion",
    owner: "TelOne (Pvt) Ltd",
    overview:
      "Project information for research. Confirm the promoter, scope, approvals and any investment terms independently before proceeding.",
    highlights: [
      "What is the proposed scope and current timetable?",
      "Which costs and participation terms are documented?",
      "Which ownership records and approvals can be checked independently?",
    ],
    stats: [{ label: "Target", value: "Not published" }],
    location: "Harare (national infrastructure footprint)",
    framework: "Request the current project scope and supporting documents.",
    regulatory:
      "Confirm current approvals with the promoter and relevant authorities.",
  },
  vaccine: {
    title: investmentProjectRoutes.vaccine,
    subtitle: "Veterinary Biotech Production Capacity",
    owner: "SIRDC",
    overview:
      "Project information for research. Confirm the promoter, scope, approvals and any investment terms independently before proceeding.",
    highlights: [
      "What is the proposed scope and current timetable?",
      "Which costs and participation terms are documented?",
      "Which ownership records and approvals can be checked independently?",
    ],
    stats: [{ label: "Target", value: "Not published" }],
    location: "Harare",
    framework: "Request the current project scope and supporting documents.",
    regulatory:
      "Confirm current approvals with the promoter and relevant authorities.",
  },
  roof_tiles: {
    title: investmentProjectRoutes.roof_tiles,
    subtitle: "Distributed Energy Technology Manufacturing",
    owner: "Orangerose Investments",
    overview:
      "Project information for research. Confirm the promoter, scope, approvals and any investment terms independently before proceeding.",
    highlights: [
      "What is the proposed scope and current timetable?",
      "Which costs and participation terms are documented?",
      "Which ownership records and approvals can be checked independently?",
    ],
    stats: [{ label: "Target", value: "Not published" }],
    location: "Harare",
    framework: "Request the current project scope and supporting documents.",
    regulatory:
      "Confirm current approvals with the promoter and relevant authorities.",
  },
  radco_solar: {
    title: investmentProjectRoutes.radco_solar,
    subtitle: "Integrated Energy and Smart Infrastructure",
    owner: "RADCO Holdings",
    overview:
      "Project information for research. Confirm the promoter, scope, approvals and any investment terms independently before proceeding.",
    highlights: [
      "What is the proposed scope and current timetable?",
      "Which costs and participation terms are documented?",
      "Which ownership records and approvals can be checked independently?",
    ],
    stats: [{ label: "Target", value: "Not published" }],
    location: "Mashonaland Central",
    framework: "Request the current project scope and supporting documents.",
    regulatory:
      "Confirm current approvals with the promoter and relevant authorities.",
  },
};

export default function ProjectDetails() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback });
  const [matched, params] = useRoute<{ id: string }>(
    "/investment/projects/:id"
  );
  const project =
    matched && params?.id && Object.hasOwn(PROJECTS, params.id)
      ? PROJECTS[params.id]
      : null;

  return (
    <Layout>
      <section className="document-section min-h-screen bg-slate-950">
        <div className="container mx-auto max-w-5xl space-y-8">
          <Link
            href="/investment"
            className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-white/70 hover:text-zim-gold"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />{" "}
            {tr("investment.project_details.back", "Back to Investment")}
          </Link>

          {!project ? (
            <div className="content-panel editorial-panel p-8 text-white">
              <h1 className="page-title">
                {tr(
                  "investment.project_details.not_found_title",
                  "Project not found"
                )}
              </h1>
              <p className="text-white/75 mt-2">
                {tr(
                  "investment.project_details.not_found_desc",
                  "This project profile is unavailable. Return to the project catalogue to explore other entries."
                )}
              </p>
            </div>
          ) : (
            <>
              <ResearchHandoff kind="project" subjectKey={params?.id || ""} />
              <div className="content-panel editorial-panel p-8 md:p-10 text-white">
                <Badge className="mb-4 bg-zim-gold/10 text-zim-gold border border-zim-gold/20 uppercase text-[10px] tracking-widest font-black">
                  {tr("investment.project_details.badge", "Project Details")}
                </Badge>
                <h1 className="page-title">
                  {tr(`investment.projects.${params?.id}.title`, project.title)}
                </h1>
                <p className="mt-3 text-sm text-white/75">
                  {tr(
                    `investment.projects.${params?.id}.description`,
                    project.subtitle
                  )}
                </p>
                <p className="mt-2 text-sm text-white/70 uppercase tracking-widest font-black">
                  {tr(
                    "investment.project_details.responsible_company",
                    "Listed promoter"
                  )}
                  : {project.owner}
                </p>
                <p className="mt-6 text-sm text-white/80 leading-relaxed">
                  {tr(
                    "investment.project_details.profile_notice",
                    project.overview
                  )}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="content-panel editorial-panel p-8 text-white">
                  <h2 className="!text-base font-black tracking-tight mb-4 flex items-center gap-2">
                    <CircleHelp className="h-5 w-5 text-zim-gold" />{" "}
                    {tr(
                      "investment.project_details.highlights",
                      "Questions to explore"
                    )}
                  </h2>
                  <ul className="space-y-3">
                    {project.highlights.map((item, index) => (
                      <li
                        key={item}
                        className="text-sm text-white/80 leading-relaxed"
                      >
                        {tr(
                          `investment.project_details.question${index + 1}`,
                          item
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="content-panel editorial-panel p-8 text-white">
                  <h2 className="!text-base font-black tracking-tight mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-zim-gold" />{" "}
                    {tr(
                      "investment.project_details.key_metrics",
                      "Details to confirm"
                    )}
                  </h2>
                  <div className="space-y-3">
                    {project.stats.map(stat => (
                      <div
                        key={stat.label}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                      >
                        <span className="text-white/75 text-sm">
                          {tr(
                            `investment.project_details.stat_${STAT_LABEL_KEYS[stat.label] || "target"}`,
                            stat.label
                          )}
                        </span>
                        <span className="font-black text-sm">
                          {tr(
                            stat.label === "Target"
                              ? "investment.project_card.unavailable"
                              : "investment.project_card.verified",
                            stat.value
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="content-panel editorial-panel p-8 text-white grid md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-white/70 !text-[11px] uppercase tracking-widest">
                    {tr(
                      "investment.project_details.location",
                      "Profile location"
                    )}
                  </p>
                  <p className="font-bold text-sm mt-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-zim-gold" />{" "}
                    {project.location}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-white/70 !text-[11px] uppercase tracking-widest">
                    {tr(
                      "investment.project_details.land_framework",
                      "Project background"
                    )}
                  </p>
                  <p className="font-bold text-sm mt-2 flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-zim-gold" />{" "}
                    {tr(
                      "investment.project_details.confirm_scope",
                      project.framework
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-white/70 !text-[11px] uppercase tracking-widest">
                    {tr("investment.project_details.regulatory", "Approvals")}
                  </p>
                  <p className="font-bold text-sm mt-2 flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-zim-gold" />{" "}
                    {tr(
                      "investment.project_details.confirm_approvals",
                      project.regulatory
                    )}
                  </p>
                </div>
              </div>

              <div>
                <Button
                  asChild
                  className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full px-6"
                >
                  <Link href="/ntir">
                    {tr(
                      "investment.project_details.search_ntir",
                      "Search business directory"
                    )}
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
