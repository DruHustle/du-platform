import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Menu, X, Search, Globe, User, ChevronDown, MessageCircle, ExternalLink, Mail, Phone, MapPin } from "lucide-react";
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

  // Handle scroll effect for header
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
    { 
      name: "Success Stories", 
      href: "/success-stories",
      children: null
    },
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
    console.log("Searching for:", searchQuery);
    setSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground py-2 text-sm hidden md:block">
        <div className="container flex justify-between items-center">
          <div className="flex items-center gap-6">
            <a href="mailto:info@zigd.co.zw" className="flex items-center gap-2 hover:text-secondary transition-colors">
              <Mail className="h-3.5 w-3.5" />
              <span>info@zigd.co.zw</span>
            </a>
            <a href="tel:+263771234567" className="flex items-center gap-2 hover:text-secondary transition-colors">
              <Phone className="h-3.5 w-3.5" />
              <span>+263 77 123 4567</span>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span>Harare, Zimbabwe</span>
            </span>
            <span className="text-secondary font-medium">Vision 2030</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled 
          ? 'bg-white/98 backdrop-blur-lg shadow-md' 
          : 'bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60'
      }`}>
        <div className="container flex h-16 md:h-18 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-2 md:space-x-3 cursor-pointer flex-shrink-0 group">
              <img
                src="/images/made_in_zimbabwe.png"
                alt="Made in Zimbabwe"
                className="h-9 w-9 md:h-11 md:w-11 object-contain flex-shrink-0 transition-transform group-hover:scale-105"
              />
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-primary whitespace-nowrap tracking-tight">
                  ZIGD Gateway
                </h1>
                <p className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                  Zimbabwe Global & Diaspora
                </p>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation with Mega Menu */}
          <nav className="hidden lg:flex items-center space-x-1 flex-shrink-0">
            {navigation.map((item) => (
              item.children ? (
                <DropdownMenu key={item.href}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isActive(item.href) ? "default" : "ghost"}
                      className={`${isActive(item.href) ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/5"} flex items-center gap-1 font-medium transition-all`}
                    >
                      {item.name}
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-72 p-3 shadow-xl border-t-2 border-t-primary animate-in fade-in-0 zoom-in-95">
                    <Link href={item.href}>
                      <DropdownMenuItem className="cursor-pointer font-semibold text-primary hover:bg-primary/5 rounded-lg p-3">
                        View All {item.name}
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator className="my-2" />
                    {item.children.map((child, idx) => (
                      <Link href={item.href} key={idx}>
                        <DropdownMenuItem className="cursor-pointer flex flex-col items-start py-3 px-3 hover:bg-muted/50 rounded-lg transition-colors">
                          <span className="font-medium text-foreground">{child.name}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">{child.description}</span>
                        </DropdownMenuItem>
                      </Link>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={`${isActive(item.href) ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/5"} font-medium transition-all`}
                  >
                    {item.name}
                  </Button>
                </Link>
              )
            ))}
          </nav>

          {/* Utility Icons */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Search */}
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden md:flex hover:bg-primary/5 transition-colors">
                  <Search className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">Search ZIGD Gateway</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSearch} className="mt-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Search for exports, investments, tourism..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      autoFocus
                    />
                    <Button type="submit" className="px-6">Search</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Region Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden md:flex hover:bg-primary/5 transition-colors">
                  <Globe className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 shadow-xl">
                <DropdownMenuLabel className="text-primary font-semibold">Select Region</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(regions).map(([continent, countries]) => (
                  <div key={continent}>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal uppercase tracking-wider">{continent}</DropdownMenuLabel>
                    {countries.map((country) => (
                      <DropdownMenuItem 
                        key={country}
                        onClick={() => setSelectedRegion(country)}
                        className={`cursor-pointer transition-colors ${selectedRegion === country ? 'bg-primary/10 text-primary' : ''}`}
                      >
                        {country}
                        {selectedRegion === country && <span className="ml-auto text-primary font-bold">✓</span>}
                      </DropdownMenuItem>
                    ))}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Login Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2 border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Login</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52 shadow-xl">
                <DropdownMenuItem className="cursor-pointer py-3 hover:bg-primary/5">
                  <User className="h-4 w-4 mr-3 text-primary" />
                  <span>Client Portal</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-3 hover:bg-primary/5">
                  <User className="h-4 w-4 mr-3 text-primary" />
                  <span>Investor Portal</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer py-3 hover:bg-primary/5">
                  <User className="h-4 w-4 mr-3 text-primary" />
                  <span>Diaspora KYC</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 hover:bg-primary/5 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t bg-white shadow-xl animate-in slide-in-from-top-2">
            <nav className="container py-4 flex flex-col space-y-1">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={`w-full justify-start text-left ${isActive(item.href) ? "bg-primary text-primary-foreground" : "hover:bg-primary/5"}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Button>
                </Link>
              ))}
              <div className="pt-4 border-t space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => setSearchOpen(true)}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <User className="h-4 w-4 mr-2" />
                  Login
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/263771234567?text=Hello%2C%20I%20would%20like%20to%20inquire%20about%20ZIGD%20Gateway%20services"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-fab group"
        aria-label="Contact us on WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-foreground text-background text-sm px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
          Chat with us
        </span>
      </a>

      {/* Footer */}
      <footer className="border-t bg-primary text-primary-foreground">
        {/* Main Footer */}
        <div className="container py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/images/made_in_zimbabwe.png"
                  alt="Made in Zimbabwe"
                  className="h-10 w-10 object-contain"
                />
                <h3 className="font-bold text-xl">ZIGD Gateway</h3>
              </div>
              <p className="text-sm opacity-90 leading-relaxed mb-4">
                Connecting Zimbabwe's diaspora with trade, tourism, and investment opportunities. Building bridges for economic transformation.
              </p>
              <div className="flex items-center gap-2 text-secondary">
                <span className="font-semibold">Supporting Vision 2030</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-lg mb-4 text-secondary">Quick Links</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/export-hub" className="opacity-90 hover:opacity-100 hover:text-secondary transition-colors link-underline">Export Hub</Link></li>
                <li><Link href="/tourism" className="opacity-90 hover:opacity-100 hover:text-secondary transition-colors link-underline">Tourism</Link></li>
                <li><Link href="/investment" className="opacity-90 hover:opacity-100 hover:text-secondary transition-colors link-underline">Investment</Link></li>
                <li><Link href="/trade" className="opacity-90 hover:opacity-100 hover:text-secondary transition-colors link-underline">Trade</Link></li>
                <li><Link href="/success-stories" className="opacity-90 hover:opacity-100 hover:text-secondary transition-colors link-underline">Success Stories</Link></li>
              </ul>
            </div>

            {/* Partner Sites */}
            <div>
              <h4 className="font-semibold text-lg mb-4 text-secondary">Partner Sites</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="https://zimbabwetourism.net/" target="_blank" rel="noopener noreferrer" className="opacity-90 hover:opacity-100 hover:text-secondary transition-colors flex items-center gap-2">
                    Zimbabwe Tourism <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a href="https://zidainvest.com/" target="_blank" rel="noopener noreferrer" className="opacity-90 hover:opacity-100 hover:text-secondary transition-colors flex items-center gap-2">
                    ZIDA Invest <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a href="https://tradezimbabwe.com/" target="_blank" rel="noopener noreferrer" className="opacity-90 hover:opacity-100 hover:text-secondary transition-colors flex items-center gap-2">
                    ZimTrade <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a href="https://www.zimra.co.zw/" target="_blank" rel="noopener noreferrer" className="opacity-90 hover:opacity-100 hover:text-secondary transition-colors flex items-center gap-2">
                    ZIMRA <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-semibold text-lg mb-4 text-secondary">Contact Us</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-secondary" />
                  <a href="mailto:info@zigd.co.zw" className="opacity-90 hover:opacity-100 hover:text-secondary transition-colors">
                    info@zigd.co.zw
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-secondary" />
                  <a href="tel:+263771234567" className="opacity-90 hover:opacity-100 hover:text-secondary transition-colors">
                    +263 77 123 4567
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-secondary mt-0.5" />
                  <span className="opacity-90">
                    Harare, Zimbabwe
                  </span>
                </li>
              </ul>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-secondary" />
                <span className="opacity-75">Region: {selectedRegion}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/10">
          <div className="container py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p className="opacity-90">&copy; 2026 ZIGD Gateway. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              <a href="#" className="opacity-75 hover:opacity-100 hover:text-secondary transition-colors">Privacy Policy</a>
              <a href="#" className="opacity-75 hover:opacity-100 hover:text-secondary transition-colors">Terms of Service</a>
              <a href="#" className="opacity-75 hover:opacity-100 hover:text-secondary transition-colors">Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
