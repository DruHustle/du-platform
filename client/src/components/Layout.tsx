import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Menu, X, Search, Globe, User, ChevronDown, MessageCircle, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('zigd-region') || 'Zimbabwe';
    }
    return 'Zimbabwe';
  });

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
    // Search functionality placeholder
    console.log("Searching for:", searchQuery);
    setSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="container flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-2 md:space-x-3 cursor-pointer flex-shrink-0">
              <img
              src="/images/made_in_zimbabwe.png"
              alt="Made in Zimbabwe"
                className="h-8 w-8 md:h-10 md:w-10 object-contain flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-base md:text-xl font-bold text-primary whitespace-nowrap">ZIGD Gateway</h1>
                <p className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">Zimbabwe Global & Diaspora</p>
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
                      className={`${isActive(item.href) ? "bg-primary text-primary-foreground" : ""} flex items-center gap-1`}
                    >
                      {item.name}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 p-2">
                    <Link href={item.href}>
                      <DropdownMenuItem className="cursor-pointer font-semibold">
                        View All {item.name}
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    {item.children.map((child, idx) => (
                      <Link href={item.href} key={idx}>
                        <DropdownMenuItem className="cursor-pointer flex flex-col items-start py-2">
                          <span className="font-medium">{child.name}</span>
                          <span className="text-xs text-muted-foreground">{child.description}</span>
                        </DropdownMenuItem>
                      </Link>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={isActive(item.href) ? "bg-primary text-primary-foreground" : ""}
                  >
                    {item.name}
                  </Button>
                </Link>
              )
            ))}
          </nav>

          {/* Utility Icons */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden md:flex">
                  <Search className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Search ZIGD Gateway</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSearch} className="mt-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search for exports, investments, tourism..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    <Button type="submit">Search</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Region Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden md:flex">
                  <Globe className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Select Region</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(regions).map(([continent, countries]) => (
                  <div key={continent}>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">{continent}</DropdownMenuLabel>
                    {countries.map((country) => (
                      <DropdownMenuItem 
                        key={country}
                        onClick={() => setSelectedRegion(country)}
                        className={`cursor-pointer ${selectedRegion === country ? 'bg-primary/10' : ''}`}
                      >
                        {country}
                        {selectedRegion === country && <span className="ml-auto text-primary">✓</span>}
                      </DropdownMenuItem>
                    ))}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Login Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Login
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <DropdownMenuItem className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Client Portal
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Investor Portal
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Diaspora KYC
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 hover:bg-accent rounded-md transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t bg-white shadow-lg">
            <nav className="container py-4 flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={`w-full justify-start ${isActive(item.href) ? "bg-primary text-primary-foreground" : ""}`}
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
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110"
        aria-label="Contact us on WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>

      {/* Footer */}
      <footer className="border-t bg-primary text-primary-foreground">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">ZIGD Gateway</h3>
              <p className="text-sm opacity-90">
                Connecting Zimbabwe's diaspora with trade, tourism, and investment opportunities.
              </p>
              <p className="text-sm opacity-75 mt-4">
                Supporting Vision 2030 through diaspora engagement and economic transformation.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/export-hub" className="opacity-90 hover:opacity-100">Export Hub</Link></li>
                <li><Link href="/tourism" className="opacity-90 hover:opacity-100">Tourism</Link></li>
                <li><Link href="/investment" className="opacity-90 hover:opacity-100">Investment</Link></li>
                <li><Link href="/trade" className="opacity-90 hover:opacity-100">Trade</Link></li>
                <li><Link href="/success-stories" className="opacity-90 hover:opacity-100">Success Stories</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Partner Sites</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://zimbabwetourism.net/" target="_blank" rel="noopener noreferrer" className="opacity-90 hover:opacity-100 flex items-center gap-1">Zimbabwe Tourism <ExternalLink className="h-3 w-3" /></a></li>
                <li><a href="https://zidainvest.com/" target="_blank" rel="noopener noreferrer" className="opacity-90 hover:opacity-100 flex items-center gap-1">ZIDA Invest <ExternalLink className="h-3 w-3" /></a></li>
                <li><a href="https://tradezimbabwe.com/" target="_blank" rel="noopener noreferrer" className="opacity-90 hover:opacity-100 flex items-center gap-1">ZimTrade <ExternalLink className="h-3 w-3" /></a></li>
                <li><a href="https://www.zimra.co.zw/" target="_blank" rel="noopener noreferrer" className="opacity-90 hover:opacity-100 flex items-center gap-1">ZIMRA <ExternalLink className="h-3 w-3" /></a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Vision 2030</h4>
              <p className="text-sm opacity-90">
                Supporting Zimbabwe's economic transformation through diaspora engagement.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="text-sm opacity-75">{selectedRegion}</span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-primary-foreground/20 flex flex-col md:flex-row justify-between items-center gap-4 text-sm opacity-90">
            <p>&copy; 2026 ZIGD Gateway. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:opacity-100">Privacy Policy</a>
              <a href="#" className="hover:opacity-100">Terms of Service</a>
              <a href="#" className="hover:opacity-100">Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
