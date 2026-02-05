import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { BookOpen, Plane, TrendingUp, Package } from "lucide-react";

export default function Home() {
  const modules = [
    {
      title: "Export Knowledge Hub",
      description: "Access German market requirements, regulations, certifications, and connect with potential partners for exporting Zimbabwean products.",
      icon: BookOpen,
      href: "/export-hub",
      color: "border-l-4 border-l-green-600 bg-green-600/5 hover:bg-green-600/10",
      bgImage: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663323515850/kreNqAHriNxTszcg.jpg"
    },
    {
      title: "Tourism Information",
      description: "Discover Zimbabwe's world-class attractions, plan your visit, and explore the Forbes #1 destination to visit in 2025.",
      icon: Plane,
      href: "/tourism",
      color: "border-l-4 border-l-yellow-500 bg-yellow-500/5 hover:bg-yellow-500/10",
      bgImage: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663323515850/VCkjwnzexqBLwEsw.jpg"
    },
    {
      title: "Investment Opportunities",
      description: "Explore diaspora-friendly micro-investment and crowdfunding opportunities in verified Zimbabwean projects.",
      icon: TrendingUp,
      href: "/investment",
      color: "border-l-4 border-l-red-600 bg-red-600/5 hover:bg-red-600/10",
      bgImage: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663323515850/tnmQvoljziNwaaOa.jpg"
    },
    {
      title: "Trade Information",
      description: "Access comprehensive trade resources, export development programs, and connect with Zimbabwe's thriving export sectors.",
      icon: Package,
      href: "/trade",
      color: "border-l-4 border-l-slate-800 bg-slate-800/5 hover:bg-slate-800/10",
      bgImage: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663323515850/xrZBHerHOgqkwoKu.jpeg"
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://files.manuscdn.com/user_upload_by_module/session_file/310519663323515850/VCkjwnzexqBLwEsw.jpg')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-primary/70" />
        </div>
        
        <div className="relative z-10 container text-center text-white">
          <div className="flex justify-center mb-6">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663323515850/TmKWfnNWeRItITtG.png"
              alt="Zimbabwe Flag"
              className="h-16 md:h-24 w-auto"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 tracking-tight px-4">
            Diaspora Unlocked
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-3 md:mb-4 max-w-3xl mx-auto font-medium px-4">
            Trade, Tourism and Investment Acceleration for Vision 2030
          </p>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-6 md:mb-8 max-w-2xl mx-auto opacity-95 px-4">
            A unified digital platform connecting Zimbabwe's global diaspora with opportunities at home
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Link href="/export-hub">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Explore Export Hub
              </Button>
            </Link>
            <Link href="/investment">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 hover:bg-white/20 text-white border-white">
                View Investments
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Strategic Overview */}
      <section className="py-16 bg-black/5">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
              Our Global Diaspora is a Powerful Catalyst for National Growth
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Transforming engagement through market access, trust infrastructure, and digital coordination
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Beyond Remittances",
                description: "Converting passive transfers into active national investments",
                icon: "💰",
                bgColor: "bg-yellow-500/10 hover:bg-yellow-500/20",
                borderColor: "border-t-4 border-t-yellow-500"
              },
              {
                title: "Global Expertise",
                description: "Tapping into professional knowledge, technical skills, and innovation worldwide",
                icon: "🧠",
                bgColor: "bg-green-600/10 hover:bg-green-600/20",
                borderColor: "border-t-4 border-t-green-600"
              },
              {
                title: "Market Access",
                description: "Leveraging diaspora networks for direct conduits into international retail chains",
                icon: "🌍",
                bgColor: "bg-red-600/10 hover:bg-red-600/20",
                borderColor: "border-t-4 border-t-red-600"
              },
              {
                title: "Brand Ambassadors",
                description: "Empowering our people abroad as natural advocates for Zimbabwean tourism and investment",
                icon: "🎯",
                bgColor: "bg-slate-800/10 hover:bg-slate-800/20",
                borderColor: "border-t-4 border-t-slate-800"
              }
            ].map((item, index) => (
              <Card key={index} className={`text-center hover-lift ${item.bgColor} ${item.borderColor}`}>
                <CardHeader>
                  <div className="text-4xl mb-2">{item.icon}</div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Four Modules */}
      <section className="py-16 bg-black/5">
        <div className="container">
          <div className="text-center mb-12 px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              The Zimbabwe Global and Diaspora Gateway
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
              A centralized digital hub for global engagement, consolidating information from ZIDA, ZimTrade, and Zimbabwe Tourism
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <Card key={index} className={`overflow-hidden hover-lift ${module.color}`}>
                  <div className="relative h-48 overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${module.bgImage}')` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    <div className="absolute bottom-4 left-4 text-white">
                      <Icon className="h-10 w-10 mb-2" />
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-2xl">{module.title}</CardTitle>
                    <CardDescription className="text-base">{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={module.href}>
                      <Button className="w-full" size="lg">
                        Learn More
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Connect with Zimbabwe?
          </h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto opacity-95">
            Join thousands of diaspora members contributing to Zimbabwe's Vision 2030
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/export-hub">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Start Exploring
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
