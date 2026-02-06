import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Export Hub", href: "/export-hub" },
    { name: "Tourism", href: "/tourism" },
    { name: "Investment", href: "/investment" },
    { name: "Trade", href: "/trade" },
    { name: "Success Stories", href: "/success-stories" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 flex-shrink-0">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive(item.href) ? "default" : "ghost"}
                  className={isActive(item.href) ? "bg-primary text-primary-foreground" : ""}
                >
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-accent rounded-md transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white shadow-lg">
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
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-primary text-primary-foreground">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">ZIGD Gateway</h3>
              <p className="text-sm opacity-90">
                Connecting Zimbabwe's diaspora with trade, tourism, and investment opportunities.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/export-hub" className="opacity-90 hover:opacity-100">Export Hub</Link></li>
                <li><Link href="/tourism" className="opacity-90 hover:opacity-100">Tourism</Link></li>
                <li><Link href="/investment" className="opacity-90 hover:opacity-100">Investment</Link></li>
                <li><Link href="/trade" className="opacity-90 hover:opacity-100">Trade</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Partner Sites</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://zimbabwetourism.net/" target="_blank" rel="noopener noreferrer" className="opacity-90 hover:opacity-100">Zimbabwe Tourism</a></li>
                <li><a href="https://zidainvest.com/" target="_blank" rel="noopener noreferrer" className="opacity-90 hover:opacity-100">ZIDA Invest</a></li>
                <li><a href="https://tradezimbabwe.com/" target="_blank" rel="noopener noreferrer" className="opacity-90 hover:opacity-100">ZimTrade</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Vision 2030</h4>
              <p className="text-sm opacity-90">
                Supporting Zimbabwe's economic transformation through diaspora engagement.
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-primary-foreground/20 text-center text-sm opacity-90">
            <p>&copy; 2026 ZIGD Gateway. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
