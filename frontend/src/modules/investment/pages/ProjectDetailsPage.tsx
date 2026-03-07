import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, MapPin, Ruler, Landmark, Building2 } from "lucide-react";
import { Link, useRoute } from "wouter";

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

const PROJECTS: Record<string, ProjectDetails> = {
  masuwe: {
    title: "Masuwe SEZ Construction of Villas Project",
    subtitle: "Tourism Infrastructure Opportunity near Victoria Falls",
    owner: "Mosi Oa Tunya Development Company",
    overview:
      "Masuwe SEZ is located about 10km from Victoria Falls City on the Victoria Falls-Bulawayo highway. It was established under General Notice 747 of 2018 and operates under Zimbabwe's Special Economic Zone framework.",
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
    location: "Matabeleland North (Victoria Falls Corridor)",
    framework: "SEZ Infrastructure Development",
    regulatory: "SEZ Act / Investment Framework",
  },
  leather: {
    title: "Linkdef Soap Manufacturing Project",
    subtitle: "Consumer Goods Manufacturing Expansion",
    owner: "Linkdef Soap Manufacturing (Pvt) Ltd",
    overview: "Establish a modern soap and detergent manufacturing operation aligned to Zimbabwe's industrialization agenda.",
    highlights: ["Import substitution", "Local value addition", "Scalable FMCG production"],
    stats: [{ label: "Target", value: "$180k" }],
    location: "Harare",
    framework: "Manufacturing Scale-Up",
    regulatory: "Industrial Licensing / Investment Support",
  },
  apparel: {
    title: "NRZ Concrete Manufacturing Plant Project",
    subtitle: "Rail Infrastructure Supply Chain Investment",
    owner: "National Railways of Zimbabwe",
    overview: "Concrete sleeper manufacturing project designed to support railway rehabilitation and industrial supply capacity.",
    highlights: ["Rail infrastructure support", "Domestic supply chain", "Industrial job creation"],
    stats: [{ label: "Target", value: "$300k" }],
    location: "Bulawayo",
    framework: "Infrastructure-linked Manufacturing",
    regulatory: "Public Infrastructure Partnership Model",
  },
  horticulture: {
    title: "CICADA Macadamia and Avocado Plantation",
    subtitle: "High-Value Crop and Export Processing Platform",
    owner: "Cicada Group",
    overview: "Commercial macadamia and avocado production with strong value-add and export potential across regional and global markets.",
    highlights: ["Top export crop category", "Value addition potential", "Agriculture-to-export chain"],
    stats: [{ label: "Target", value: "$120k" }],
    location: "Midlands / Manicaland",
    framework: "Commercial Agriculture Expansion",
    regulatory: "Agriculture Investment Framework",
  },
  fintech: {
    title: "Powertel Fibre Internet (GPON)",
    subtitle: "National Broadband Infrastructure Rollout",
    owner: "Powertel Communications (Pvt) Ltd",
    overview: "Broadband network expansion focused on improving internet penetration, capacity, and enterprise-grade connectivity.",
    highlights: ["Fibre access growth", "Digital infrastructure", "Enterprise connectivity"],
    stats: [{ label: "Target", value: "$850k" }],
    location: "Harare (national expansion scope)",
    framework: "ICT Infrastructure Development",
    regulatory: "Telecom / ICT Regulatory Compliance",
  },
  solar: {
    title: "Solgas Energy 60MW Solar PV Plant + 20MWh BESS",
    subtitle: "Utility-Scale Renewable Energy Deployment",
    owner: "Solgas Energy Pvt Ltd",
    overview: "A combined solar and battery storage project to support grid reliability, clean generation, and energy security.",
    highlights: ["60MW Solar PV", "20MWh battery storage", "National grid support"],
    stats: [{ label: "Target", value: "$2.5M" }],
    location: "Matabeleland North",
    framework: "Independent Power Project (IPP)",
    regulatory: "Energy Licensing / Environmental Compliance",
  },
  beef_dairy: {
    title: "Agro Strong Beef and Dairy Farming Venture",
    subtitle: "Livestock and Dairy Value Chain Expansion",
    owner: "Agro Strong (Pvt) Ltd",
    overview: "Integrated beef and dairy operation focused on herd growth, processing readiness, and consistent domestic supply.",
    highlights: ["Herd expansion strategy", "Dairy processing potential", "Regional supply opportunity"],
    stats: [{ label: "Target", value: "$420k" }],
    location: "Matabeleland South",
    framework: "Commercial Livestock Development",
    regulatory: "Agriculture and Veterinary Compliance",
  },
  agro_park: {
    title: "Goromonzi Agro Processing Industrial Park (SEZ)",
    subtitle: "Agro-Industrial Cluster Development",
    owner: "Goromonzi Agro Industrial Company (GAIC)",
    overview: "SEZ-linked agro-processing park designed to improve post-harvest value addition and export competitiveness.",
    highlights: ["Processing ecosystem", "SEZ industrial land", "Export-oriented value chains"],
    stats: [{ label: "Target", value: "$1.8M" }],
    location: "Mashonaland East",
    framework: "SEZ Agro-Industrial Development",
    regulatory: "SEZ Licensing / Agro-Industry Compliance",
  },
  data_centres: {
    title: "TelOne Data Centres Project",
    subtitle: "Digital Infrastructure and Hosting Expansion",
    owner: "TelOne (Pvt) Ltd",
    overview: "Data centre expansion programme to support enterprise hosting, government workloads, and cloud-scale services.",
    highlights: ["Tiered data centre capacity", "Cloud hosting growth", "National digital resilience"],
    stats: [{ label: "Target", value: "$3.2M" }],
    location: "Harare (national infrastructure footprint)",
    framework: "ICT Infrastructure Modernization",
    regulatory: "Telecom and Data Compliance",
  },
  vaccine: {
    title: "Foot and Mouth Disease Vaccine Manufacturing Project",
    subtitle: "Veterinary Biotech Production Capacity",
    owner: "SIRDC",
    overview: "Domestic vaccine production project intended to enhance livestock disease response and reduce import exposure.",
    highlights: ["Veterinary biotech", "Strategic health security", "Import substitution pathway"],
    stats: [{ label: "Target", value: "$1.1M" }],
    location: "Harare",
    framework: "Industrial Biotech Manufacturing",
    regulatory: "Health and Biotech Manufacturing Compliance",
  },
  roof_tiles: {
    title: "Orangerose Solar Roof Tile Manufacturing Project",
    subtitle: "Distributed Energy Technology Manufacturing",
    owner: "Orangerose Investments",
    overview: "Manufacturing line for integrated solar roof tiles to support clean energy adoption in residential and commercial developments.",
    highlights: ["Clean-tech manufacturing", "Distributed solar adoption", "Building-integrated energy products"],
    stats: [{ label: "Target", value: "$950k" }],
    location: "Harare",
    framework: "Renewable Manufacturing Scale-Up",
    regulatory: "Manufacturing and Energy Product Compliance",
  },
  radco_solar: {
    title: "RADCO Solar and Smart City Project",
    subtitle: "Integrated Energy and Smart Infrastructure",
    owner: "RADCO Holdings",
    overview: "Grid-support solar generation and smart infrastructure components designed for long-term sustainable urban growth.",
    highlights: ["Utility-scale solar", "Smart city systems", "Long-horizon infrastructure returns"],
    stats: [{ label: "Target", value: "$4.1M" }],
    location: "Mashonaland Central",
    framework: "Smart Infrastructure PPP Model",
    regulatory: "Energy, Urban Planning, and Environmental Compliance",
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
            <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-white">
              <h1 className="text-3xl font-black">Project not found</h1>
              <p className="text-white/75 mt-2">The selected project ID does not exist.</p>
            </div>
          ) : (
            <>
              <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10 text-white">
                <Badge className="mb-4 bg-zim-gold/10 text-zim-gold border border-zim-gold/20 uppercase text-[10px] tracking-widest font-black">
                  Project Details
                </Badge>
                <h1 className="!text-xl md:!text-2xl font-black tracking-tighter">{project.title}</h1>
                <p className="mt-3 !text-sm text-white/75">{project.subtitle}</p>
                <p className="mt-2 !text-xs text-white/70 uppercase tracking-widest font-black">
                  Responsible Company: {project.owner}
                </p>
                <p className="mt-6 !text-sm text-white/80 leading-relaxed">{project.overview}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-white">
                  <h2 className="!text-base font-black tracking-tight mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-zim-gold" /> Highlights
                  </h2>
                  <ul className="space-y-3">
                    {project.highlights.map((item) => (
                      <li key={item} className="!text-xs text-white/80 leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-white">
                  <h2 className="!text-base font-black tracking-tight mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-zim-gold" /> Key Metrics
                  </h2>
                  <div className="space-y-3">
                    {project.stats.map((stat) => (
                      <div key={stat.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                        <span className="text-white/75 !text-xs">{stat.label}</span>
                        <span className="font-black !text-sm">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-white grid md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-white/70 !text-[11px] uppercase tracking-widest">Location</p>
                  <p className="font-bold !text-sm mt-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-zim-gold" /> {project.location}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-white/70 !text-[11px] uppercase tracking-widest">Land Framework</p>
                  <p className="font-bold !text-sm mt-2 flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-zim-gold" /> {project.framework}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-white/70 !text-[11px] uppercase tracking-widest">Regulatory</p>
                  <p className="font-bold !text-sm mt-2 flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-zim-gold" /> {project.regulatory}
                  </p>
                </div>
              </div>

              <div>
                <Button asChild className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full px-6">
                  <Link href="/ntir">Search NTIR Database.</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
