import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Menu, X, Search, Globe, User, ChevronDown, MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const languages = [
    { name: "English", flag: "🇬🇧", code: "en" },
    { name: "chiShona", flag: "🇿🇼", code: "sn" },
    { name: "isiNdebele", flag: "🇿🇼", code: "nd" },
    { name: "Deutsch", flag: "🇩🇪", code: "de" }
  ];

  const navigation = [
    { name: t('nav.home'), href: "/", children: null },
    { 
      name: t('nav.export'), 
      href: "/export-hub",
      children: [
        { name: t('nav.market_requirements'), href: "/export-hub#market-requirements", description: t('nav.market_requirements_desc') },
        { name: t('nav.product_intelligence'), href: "/export-hub#product-intelligence", description: t('nav.product_intelligence_desc') },
        { name: t('nav.partner_network'), href: "/export-hub#partner-network", description: t('nav.partner_network_desc') }
      ]
    },
    { 
      name: t('nav.tourism'), 
      href: "/tourism",
      children: [
        { name: t('nav.attractions'), href: "/tourism#attractions", description: t('nav.attractions_desc') },
        { name: t('nav.plan_visit'), href: "/tourism#plan-visit", description: t('nav.plan_visit_desc') },
        { name: t('nav.diaspora_packages'), href: "/tourism#diaspora-packages", description: t('nav.diaspora_packages_desc') }
      ]
    },
    { 
      name: t('nav.investment'), 
      href: "/investment",
      children: [
        { name: t('nav.active_projects'), href: "/investment#active-projects", description: t('nav.active_projects_desc') },
        { name: t('nav.investment_calculator'), href: "/investment#investment-calculator", description: t('nav.investment_calculator_desc') },
        { name: t('nav.verified_directories'), href: "/investment#verified-directories", description: t('nav.verified_directories_desc') }
      ]
    },
    { 
      name: t('nav.trade'), 
      href: "/trade",
      children: [
        { name: t('nav.export_sectors'), href: "/trade#export-sectors", description: t('nav.export_sectors_desc') },
        { name: t('nav.export_roadmap'), href: "/trade#export-roadmap", description: t('nav.export_roadmap_desc') },
        { name: t('nav.zimtrade_programs'), href: "/trade#zimtrade-programs", description: t('nav.zimtrade_programs_desc') }
      ]
    },
    { name: t('nav.technology'), 
      href: "/technology", 
      children: [
        { name: t('nav.technology_capabilities'), href: "/technology#technology-capabilities", description: t('nav.technology_capabilities_desc') },
        { name: t('nav.technology_industries'), href: "/technology#technology-sectors", description: t('nav.technology_industries_desc') },
      ]
    },
    { name: t('nav.data'), href: "/data-visualization", children: null },
    { name: t('nav.success'), href: "/success-stories", children: null },
   
  ];

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
                alt='Logo'
                className='h-9 w-9 md:h-11 md:w-11 object-contain flex-shrink-0 transition-transform group-hover:scale-105'
              />
              <div className='min-w-0'>
                <h1 className='!text-lg md:text-xl font-bold text-primary whitespace-nowrap tracking-tight'>
                  {t('brand')}
                </h1>
                <p className='text-xs text-muted-foreground whitespace-nowrap hidden sm:block'>
                  {t('tagline')}
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
                        {t('explore')} {item.name}
                      </div>
                    </Link>
                    <div className="border-t my-2" />
                    {item.children.map((child, idx) => (
                      <Link href={child.href} key={idx}>
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
            {/* Search Dialog */}
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden sm:flex hover:bg-primary/5 transition-colors h-9 w-9 md:h-10 md:w-10">
                  <Search className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl w-[95vw]">
                <DialogHeader>
                  <DialogTitle className="text-lg md:text-xl">{t('search_title')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSearch} className="mt-4">
                  <div className="flex gap-2 md:gap-3">
                    <input
                      type="text"
                      placeholder={t('search_placeholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 px-3 md:px-4 py-2 md:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm md:text-base"
                      autoFocus
                    />
                    <Button type="submit" className="px-4 md:px-6 text-sm md:text-base">{t('search_button')}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Language Switcher (Globe) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden md:flex hover:bg-primary/5 transition-colors h-9 w-9 md:h-10 md:w-10">
                  <Globe className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 md:w-56 shadow-xl" align="end">
                <DropdownMenuLabel className="text-primary font-semibold text-sm">{t('select_lang')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {languages.map((lang) => (
                  <DropdownMenuItem 
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    className={`cursor-pointer transition-colors text-sm ${i18n.language === lang.code ? 'bg-primary/10 text-primary' : ''}`}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Account Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden md:flex hover:bg-primary/5 transition-colors h-9 w-9 md:h-10 md:w-10">
                  <User className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 md:w-56 shadow-xl" align="end">
                <DropdownMenuLabel className="text-primary font-semibold text-sm">{t('account')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-sm">{t('login')}</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-sm">{t('register')}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-sm">{t('my_investments')}</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-sm">{t('settings')}</DropdownMenuItem>
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


        {/* Mobile Menu*/}
        {mobileMenuOpen && (

          <div className="lg:hidden absolute top-14 right-0 w-72 z-50">
            <div className="bg-white/98 backdrop-blur-md border border-r-0 rounded-l-2xl rounded-r-none shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
              <div className="p-4 space-y-4 overflow-y-auto">
                <nav className="flex flex-col space-y-1">
                  {navigation.map((item) => (
                    <div key={item.href} className="flex flex-col">
                      <Link href={item.href}>
                        <Button
                          variant={isActive(item.href) ? "default" : "ghost"}
                          className="w-full justify-start text-sm font-medium h-11"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            window.scrollTo(0, 0); 
                          }}
                        >
                          {item.name}
                        </Button>
                      </Link>
                      {item.children && (
                        <div className="ml-4 flex flex-col border-l border-muted pl-2 mb-2">
                          {item.children.map((child, idx) => (
                            <Link key={idx} href={child.href}>
                              <Button
                                variant="ghost"
                                className="w-full justify-start text-xs font-normal h-9 text-muted-foreground hover:text-primary"
                                onClick={() => {
                                  setMobileMenuOpen(false);
                                }}
                              >
                                {child.name}
                              </Button>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>

                <div className="border-t pt-4 pb-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-3">
                    {t('select_lang')}
                  </p>
                  <div className="flex flex-col gap-1 px-1">
                    {languages.map((lang) => (
                      <Button
                        key={lang.code}
                        variant={i18n.language === lang.code ? "secondary" : "ghost"}
                        size="sm"
                        className={`text-xs justify-start px-3 h-10 w-full ${
                          i18n.language === lang.code ? "font-bold text-primary" : ""
                        }`}
                        onClick={() => {
                          i18n.changeLanguage(lang.code);
                          setMobileMenuOpen(false);
                          window.scrollTo({ top: 0, behavior: 'instant' });
                        }}
                      >
                        <span className="mr-2">{lang.flag}</span>
                        {lang.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
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
      >
        <div className="relative">
          <div className="absolute inset-0 bg-green-500 rounded-full blur-lg group-hover:blur-xl transition-all opacity-75 group-hover:opacity-100" />
          <button className="relative bg-green-500 hover:bg-green-600 text-white p-3 md:p-4 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:scale-110 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>
      </a>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8 md:py-12 mt-12">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-8">
            <div className="space-y-3">
              <h3 className="font-bold text-base md:text-lg">{t('about')} {t('brand')}</h3>
              <p className="text-xs md:text-sm opacity-90 leading-relaxed">
                {t('about_us')}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-base md:text-lg">{t('quick_links')}</h3>
              <ul className="space-y-2 text-xs md:text-sm">
                {navigation
                  .filter((link) => 
                    !["/", "/success-stories", "/data-visualization"].includes(link.href)
                  )
                  .map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}>
                        <span className="hover:text-secondary transition-colors cursor-pointer">
                          {link.name}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-base md:text-lg">{t('partners')}</h3>
              <ul className="space-y-2 text-xs md:text-sm">
                <li><a href="https://zimbabwetourism.net/" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">Zimbabwe Tourism</a></li>
                <li><a href="https://zidainvest.com/" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">ZIDA Invest</a></li>
                <li><a href="https://tradezimbabwe.com/" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">ZimTrade</a></li>
                <li><a href="https://www.zimra.co.zw/" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">ZIMRA</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold">{t('contact')}</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-secondary" />
                  <a href="mailto:info@diasporaunlocked.com" className="hover:text-secondary transition-colors">info@diasporaunlocked.com</a>
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
            <p className="opacity-80">© 2026 {t('brand')}. {t('all_rights_reserved')}</p>
            <div className="flex gap-4 md:gap-6">
              <a href="#" className="hover:text-secondary transition-colors">{t('privacy_policy')}</a>
              <a href="#" className="hover:text-secondary transition-colors">{t('terms_of_service')}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}