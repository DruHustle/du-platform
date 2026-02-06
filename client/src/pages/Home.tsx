import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { BookOpen, Plane, TrendingUp, Package, ArrowRight, CheckCircle, Globe, Users, BarChart3, Award } from "lucide-react";

export default function Home() {
  const modules = [
    {
      title: "Export Knowledge Hub",
      description: "Access German market requirements, regulations, certifications, and connect with potential partners for exporting Zimbabwean products.",
      icon: BookOpen,
      href: "/export-hub",
      color: "border-l-4 border-l-green-600",
      bgImage: "/images/export_hub_bg.jpg",
      stats: "50+ Export Guides"
    },
    {
      title: "Tourism Information",
      description: "Discover Zimbabwe's world-class attractions, plan your visit, and explore the Forbes #1 destination to visit in 2025.",
      icon: Plane,
      href: "/tourism",
      color: "border-l-4 border-l-yellow-500",
      bgImage: "/images/victoria_falls.jpg",
      stats: "Forbes #1 2025"
    },
    {
      title: "Investment Opportunities",
      description: "Explore diaspora-friendly micro-investment and crowdfunding opportunities in verified Zimbabwean projects.",
      icon: TrendingUp,
      href: "/investment",
      color: "border-l-4 border-l-red-600",
      bgImage: "/images/investment_bg.jpg",
      stats: "$50M+ Opportunities"
    },
    {
      title: "Trade Information",
      description: "Access comprehensive trade resources, export development programs, and connect with Zimbabwe's thriving export sectors.",
      icon: Package,
      href: "/trade",
      color: "border-l-4 border-l-slate-700",
      bgImage: "/images/great_zimbabwe.jpeg",
      stats: "8 Export Sectors"
    }
  ];

  const stats = [
    { value: "$6.8B", label: "Total Exports 2025", icon: BarChart3 },
    { value: "3.5M", label: "Global Diaspora", icon: Globe },
    { value: "$1.8B", label: "Annual Remittances", icon: TrendingUp },
    { value: "6.6%", label: "GDP Growth Rate", icon: Award }
  ];

  const features = [
    "Access verified investment opportunities",
    "Connect with German market buyers",
    "Explore tourism packages",
    "Track economic indicators"
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/victoria_falls.jpg')`,
          }}
        >
          <div className="absolute inset-0 hero-gradient" />
        </div>
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 container text-center text-white flex flex-col items-center justify-center py-16">
          <div className="flex justify-center mb-8 slide-up">
            <div className="relative">
              <img
                src="/images/made_in_zimbabwe.png"
                alt="Made in Zimbabwe"
                className="h-20 md:h-28 w-auto drop-shadow-2xl"
              />
              <div className="absolute -inset-4 bg-white/10 rounded-full blur-xl -z-10" />
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight px-4 hero-text-shadow slide-up" style={{ animationDelay: '0.1s' }}>
            Diaspora Unlocked
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl mb-4 max-w-4xl mx-auto font-semibold px-4 text-secondary slide-up" style={{ animationDelay: '0.2s' }}>
            Trade, Tourism and Investment Acceleration for Vision 2030
          </p>
          
          <p className="text-base sm:text-lg md:text-xl mb-8 max-w-2xl mx-auto opacity-95 px-4 slide-up" style={{ animationDelay: '0.3s' }}>
            A unified digital platform connecting Zimbabwe's global diaspora with opportunities at home
          </p>

          {/* Feature list */}
          <div className="flex flex-wrap justify-center gap-4 mb-10 px-4 slide-up" style={{ animationDelay: '0.4s' }}>
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
                <CheckCircle className="h-4 w-4 text-secondary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 slide-up" style={{ animationDelay: '0.5s' }}>
            <Link href="/export-hub">
              <Button size="lg" className="text-lg px-8 py-6 bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-xl hover:shadow-2xl transition-all group">
                Explore Export Hub
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/investment">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm shadow-xl">
                View Investments
              </Button>
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 scroll-indicator">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-white/60 font-medium tracking-widest uppercase">Scroll to explore</span>
              <div className="w-5 h-8 border-2 border-white/40 rounded-full flex justify-center pt-1.5 hover:border-white/60 transition-colors">
                <div className="w-1 h-2 bg-white/60 rounded-full scroll-indicator-dot" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-primary">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="text-center text-white fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <Icon className="h-8 w-8 mx-auto mb-3 text-secondary" />
                  <div className="text-3xl md:text-4xl font-bold mb-1">{stat.value}</div>
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
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
              The Zimbabwe Global and Diaspora Gateway
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Transforming engagement through market access, trust infrastructure, and digital coordination
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
                      <Button className="w-full group/btn" size="lg">
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

      {/* CTA Section */}
      <section className="section-padding-sm bg-primary text-primary-foreground">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Ready to Connect with Zimbabwe?</h2>
              <p className="opacity-90">Join thousands of diaspora members building bridges for economic transformation.</p>
            </div>
            <div className="flex gap-4">
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
