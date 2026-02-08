import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { FileText, BookOpen, Plane, TrendingUp, Package, ArrowRight, CheckCircle, Globe, Users, BarChart3, Award } from "lucide-react";

export default function Home() {
  const modules = [
    {
      title: "Export Knowledge Hub",
      description: "Access German market requirements, regulations, certifications, and connect with potential partners for exporting Zimbabwean products.",
      icon: BookOpen,
      href: "/export-hub",
      color: "border-t-4 border-t-green-600 bg-green-600/5 hover:bg-green-600/10",
      bgImage: "/images/export_hub_bg.jpg",
      stats: "50+ Export Guides"
    },
    {
      title: "Tourism Information",
      description: "Discover Zimbabwe's world-class attractions, plan your visit, and explore the Forbes #1 destination to visit in 2025.",
      icon: Plane,
      href: "/tourism",
         color: "border-t-4 border-t-yellow-500 bg-yellow-500/5 hover:bg-yellow-500/10",
      bgImage: "/images/victoria_falls.jpg",
      stats: "Forbes #1 2025"
    },
    {
      title: "Investment Opportunities",
      description: "Explore diaspora-friendly micro-investment and crowdfunding opportunities in verified Zimbabwean projects.",
      icon: TrendingUp,
      href: "/investment",
      color: "border-t-4 border-t-red-600 bg-red-600/5 hover:bg-red-600/10",
      bgImage: "/images/investment_bg.jpg",
      stats: "$50M+ Opportunities"
    },
    {
      title: "Trade Information",
      description: "Access comprehensive trade resources, export development programs, and connect with Zimbabwe's thriving export sectors.",
      icon: Package,
      href: "/trade",
      color: "border-t-4 border-t-slate-800 bg-slate-800/5 hover:bg-slate-800/10",
      bgImage: "/images/great_zimbabwe.jpeg",
      stats: "8 Export Sectors"
    }
  ];

    const stats = [
      { value: "€2.8B", label: "EU-Zimbabwe Trade", icon: TrendingUp },
      { value: "50+", label: "Export Guides", icon: FileText },
      { value: "100+", label: "Partner Network", icon: Users },
      { value: "0%", label: "EPA Tariffs", icon: Award }
    ];


  return (
    
    <Layout>
    {/* Hero Section */}
      <section className="relative min-h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/victoria_falls.jpg')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-primary/70" />
        </div>
        
        {/* Animated background elements retained for depth */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 container text-center text-white flex flex-col items-center justify-center py-12">
  
          <div className="flex justify-center mb-6 slide-up">
            <div className="relative min-w-max"> 
              <img
                src="/images/made_in_zimbabwe.png"
                alt="Made in Zimbabwe"
                className="h-24 md:h-36 w-auto object-contain drop-shadow-2xl relative z-10" 
              />
              <div className="absolute -inset-6 bg-white/10 rounded-full blur-2xl -z-10" />
            </div>
          </div>
          
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-8 tracking-tighter leading-tight px-4 hero-text-shadow slide-up" style={{ animationDelay: '0.1s' }}>
              Diaspora Unlocked
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-3 max-w-4xl mx-auto font-semibold px-4 text-secondary slide-up" style={{ animationDelay: '0.2s' }}>
              Trade, Tourism and Investment Acceleration for Vision 2030
            </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 slide-up" style={{ animationDelay: '0.5s' }}>
            <Link href="/export-hub">
              <Button size="lg" className="text-lg px-8 py-6 bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-xl transition-all group">
                Explore Export Hub
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/investment">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/40 backdrop-blur-sm shadow-xl">
                View Investments
              </Button>
            </Link>
          </div>
        </div>

      </section>

      {/* Stats Bar */}
      <section className="py-8 bg-primary">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="text-center text-white">
                  <Icon className="h-6 w-6 mx-auto mb-2 text-secondary" />
                  <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm opacity-80">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Four Modules */}
      <section className="section-padding bg-muted/30">
        <div className="container">
          <div className="text-center mb-14 px-4">
            <span className="badge-primary mb-4 inline-block">Platform Services</span>
             <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
              The Zimbabwe Global and Diaspora Gateway
            </h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
                 A digital platform connecting Zimbabwe to the rest of the world through trade, tourism, and investments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <Card key={index} className={`overflow-hidden card-professional ${module.color} group`}>
                  <div className="relative h-52 overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url('${module.bgImage}')` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    </div>
                    <div className="absolute bottom-4 left-4 text-white">
                      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl mb-2 inline-block">
                        <Icon className="h-8 w-8" />
                      </div>
                    </div>
                    <div className="absolute top-4 right-4">
                      <span className="bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                        {module.stats}
                      </span>
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl group-hover:text-primary transition-colors">{module.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href={module.href}>
                    <Button className="w-full group/btn opacity-90 hover:opacity-100 transition-opacity" size="lg">
                      Learn More
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* External Links */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Connect?
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-95">
              Join thousands of diaspora members building bridges for economic transformation.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/data-visualization">
                <Button size="lg" variant="secondary" className="shadow-lg">
                  View Economic Data
                </Button>
              </Link>
              <Link href="/success-stories">
                <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30">
                  Success Stories
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* Trust Indicators */}
      <section className="py-12 bg-background border-t">
        <div className="container">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">Diaspora Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              <span className="text-sm font-medium">ZIDA Partner</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <span className="text-sm font-medium">ZimTrade Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Vision 2030 Aligned</span>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
