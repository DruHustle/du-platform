import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Menu, X, Search, Globe, User, ChevronDown, MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import { useState, useEffect } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('zigd-region') || 'Zimbabwe';
    }
    return 'Zimbabwe';
  });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { 
      name: "Home", 
      href: "/",
      children: null
    },
    { 
      name: "Export Hub", 
      href: "/export-hub",
      children: [
        { name: "Market Requirements", description: "German market regulations and certifications" },
        { name: "Product Intelligence", description: "Product-specific export guidance" },
        { name: "Partner Network", description: "Connect with retailers and logistics" }
      ]
    },
    { 
      name: "Tourism", 
      href: "/tourism",
      children: [
        { name: "Attractions", description: "Must-visit destinations in Zimbabwe" },
        { name: "Plan Your Visit", description: "Visa, health, and travel information" },
        { name: "Diaspora Packages", description: "Special homecoming tours" }
      ]
    },
    { 
      name: "Investment", 
      href: "/investment",
      children: [
        { name: "Active Projects", description: "Browse investment opportunities" },
        { name: "Investment Calculator", description: "Simulate your returns" },
        { name: "Verified Directories", description: "NTIR and HDC registries" }
      ]
    },
    { 
      name: "Trade", 
      href: "/trade",
      children: [
        { name: "Export Sectors", description: "Key industries and opportunities" },
        { name: "Export Roadmap", description: "Step-by-step export process" },
        { name: "ZimTrade Programs", description: "Export development initiatives" }
      ]
    },
    { name: "Economic Data", href: "/data-visualization", children: null },
    { name: "Success Stories", href: "/success-stories", children: null },
  ];

  const regions = {
    "Africa": ["Zimbabwe", "South Africa"],
    "Europe": ["Germany", "United Kingdom"],
    "Americas": ["United States", "Canada"],
    "Asia-Pacific": ["Australia", "Singapore"]
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zigd-region', selectedRegion);
    }
  }, [selectedRegion]);

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled 
          ? 'bg-white/98 backdrop-blur-lg shadow-md' 
          : 'bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60'
      }`}>
        <div className="container flex h-14 md:h-16 lg:h-18 items-center justify-between gap-2 md:gap-4">
          
          {/* Logo */}
          <Link href='/'>
            <div className='flex items-center space-x-2 md:space-x-3 cursor-pointer flex-shrink-0 group min-w-0'>
              <img
                src='/images/made_in_zimbabwe.png'
                alt='Made in Zimbabwe'
                className='h-9 w-9 md:h-11 md:w-11 object-contain flex-shrink-0 transition-transform group-hover:scale-105'
              />
              <div className='min-w-0'>
                <h1 className='!text-lg md:text-xl font-bold text-primary whitespace-nowrap tracking-tight'>
                  ZIGD Platform
                </h1>
                <p className='text-xs text-muted-foreground whitespace-nowrap hidden sm:block'>
                  Zimbabwe Global & Diaspora
                </p>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex flex-1 items-center justify-end space-x-1 px-4">
            {navigation.map((item) => (
              item.children ? (
                <div
                  key={item.href}
                  className="relative group"
                  onMouseEnter={() => setOpenDropdown(item.href)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <Link href={item.href}>
                    <Button
                      variant={isActive(item.href) ? "default" : "ghost"}
                      className={`${isActive(item.href) ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/5"} flex items-center gap-1 font-medium transition-all px-2 text-xs`}
                    >
                      {item.name}
                      <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === item.href ? 'rotate-180' : ''}`} />
                    </Button>
                  </Link>
                  
                  <div className="absolute right-0 mt-0 w-72 bg-white border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-3">
                    <Link href={item.href}>
                      <div className="cursor-pointer font-semibold text-primary hover:bg-primary/5 rounded-lg p-3 mb-2 transition-colors text-sm">
                        Explore {item.name}
                      </div>
                    </Link>
                    <div className="border-t my-2" />
                    {item.children.map((child, idx) => (
                      <Link href={item.href} key={idx}>
                        <div className="cursor-pointer flex flex-col items-start py-3 px-3 hover:bg-muted/50 rounded-lg transition-colors">
                          <span className="font-medium text-foreground text-sm">{child.name}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">{child.description}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={`${isActive(item.href) ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/5"} font-medium transition-all px-2 text-xs`}
                  >
                    {item.name}
                  </Button>
                </Link>
              )
            ))}
          </nav>

          {/* Utility Icons */}
          <div className="flex items-center gap-1 md:gap-2 ml-auto">
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden sm:flex hover:bg-primary/5 transition-colors h-9 w-9 md:h-10 md:w-10">
                  <Search className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl w-[95vw]">
                <DialogHeader>
                  <DialogTitle className="text-lg md:text-xl">Search ZIGD Platform</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSearch} className="mt-4">
                  <div className="flex gap-2 md:gap-3">
                    <input
                      type="text"
                      placeholder="Search for exports, investments, tourism..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 px-3 md:px-4 py-2 md:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm md:text-base"
                      autoFocus
                    />
                    <Button type="submit" className="px-4 md:px-6 text-sm md:text-base">Search</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden md:flex hover:bg-primary/5 transition-colors h-9 w-9 md:h-10 md:w-10">
                  <Globe className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 md:w-56 shadow-xl">
                <DropdownMenuLabel className="text-primary font-semibold text-sm">Select Region</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(regions).map(([continent, countries]) => (
                  <div key={continent}>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal uppercase tracking-wider px-2 py-1">{continent}</DropdownMenuLabel>
                    {countries.map((country) => (
                      <DropdownMenuItem 
                        key={country}
                        onClick={() => setSelectedRegion(country)}
                        className={`cursor-pointer transition-colors text-sm ${selectedRegion === country ? 'bg-primary/10 text-primary' : ''}`}
                      >
                        {country}
                      </DropdownMenuItem>
                    ))}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden md:flex hover:bg-primary/5 transition-colors h-9 w-9 md:h-10 md:w-10">
                  <User className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 md:w-56 shadow-xl">
                <DropdownMenuLabel className="text-primary font-semibold text-sm">Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-sm">Login</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-sm">Register</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-sm">My Investments</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-sm">Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-primary/5 transition-colors h-9 w-9 md:h-10 md:w-10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t bg-white/95 backdrop-blur">
            <div className="container py-3 space-y-2">
              {navigation.map((item) => (
                <div key={item.href}>
                  <Link href={item.href}>
                    <Button
                      variant={isActive(item.href) ? "default" : "ghost"}
                      className="w-full justify-start text-sm"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Button>
                  </Link>
                  {item.children && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-primary/20 pl-3">
                      {item.children.map((child, idx) => (
                        <Link href={item.href} key={idx}>
                          <div 
                            className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer py-1.5"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {child.name}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full">
        {children}
      </main>

      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/+4915147416152"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 group"
        title="Contact us on WhatsApp"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-green-500 rounded-full blur-lg group-hover:blur-xl transition-all opacity-75 group-hover:opacity-100" />
          <button className="relative bg-green-500 hover:bg-green-600 text-white p-3 md:p-4 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:scale-110 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <div className="absolute bottom-full right-0 mb-2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Chat with us
          </div>
        </div>
      </a>

      <footer className="bg-primary text-primary-foreground py-8 md:py-12 mt-12">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-8">
            <div className="space-y-3">
              <h3 className="font-bold text-base md:text-lg">About ZIGD</h3>
              <p className="text-xs md:text-sm opacity-90 leading-relaxed">
                Connecting Zimbabwe's global diaspora with opportunities in trade, tourism, and investment.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-base md:text-lg">Quick Links</h3>
              <ul className="space-y-2 text-xs md:text-sm">
                {[
                  { name: "Export Hub", href: "/export-hub" },
                  { name: "Tourism", href: "/tourism" },
                  { name: "Investment", href: "/investment" },
                  { name: "Trade", href: "/trade" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>
                      <span 
                        className="hover:text-secondary transition-colors cursor-pointer"
                        onClick={() => {
                          // This ensures any "scrollToBottom" flags from previous 
                          // interactions are cleared before the new page loads
                          window.history.replaceState({ scrollToBottom: false, stayPut: false }, "");
                          window.scrollTo(0, 0); 
                        }}
                      >
                        {link.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-base md:text-lg">Partners</h3>
              <ul className="space-y-2 text-xs md:text-sm">
                <li><a href="https://zimbabwetourism.net/" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">Zimbabwe Tourism</a></li>
                <li><a href="https://zidainvest.com/" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">ZIDA Invest</a></li>
                <li><a href="https://tradezimbabwe.com/" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">ZimTrade</a></li>
                <li><a href="https://www.zimra.co.zw/" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">ZIMRA</a></li>
              </ul>
            </div>

          <div className="space-y-3">
            <h3 className="font-bold">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-secondary" />
                <a href="mailto:diaspora.unlocked@gmail.com" className="hover:text-secondary transition-colors">diaspora.unlocked@gmail.com</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-secondary" />
                <a href="tel:+4915147416152" className="hover:text-secondary transition-colors">+49 151 474 16152</a>
              </li>
              <li className="flex items-center gap-2 opacity-90">
                <MapPin className="h-4 w-4 text-secondary" />
                <span>Berlin, Germany</span>
              </li>
            </ul>
          </div>

          </div>

          <div className="border-t border-primary-foreground/20 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs md:text-sm">
            <p className="opacity-80">© 2026 ZIGD Platform. All rights reserved.</p>
            <div className="flex gap-4 md:gap-6">
              <a href="#" className="hover:text-secondary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-secondary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-secondary transition-colors">Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}