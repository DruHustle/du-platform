import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, X, Search, User, Globe, MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";


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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync mobile menu close with route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const languages = [
    { name: "English", flag: "🇬🇧", code: "en" },
    { name: "chiShona", flag: "🇿🇼", code: "sn" },
    { name: "isiNdebele", flag: "🇿🇼", code: "nd" },
    { name: "Deutsch", flag: "🇩🇪", code: "de" }
  ];

  const navigation = [
    { name: t('nav.home'), href: "/" },
    { name: t('nav.technology'), href: "/technology" },
    { name: t('nav.export'), href: "/export-hub" },
    { name: t('nav.tourism'), href: "/tourism" },
    { name: t('nav.investment'), href: "/investment" },
    { name: t('nav.trade'), href: "/trade" },
    { name: t('nav.data'), href: "/data-visualization" },
    { name: t('nav.success'), href: "/success-stories" },
  ];

  const isActive = (href: string) => (href === "/" ? location === "/" : location.startsWith(href));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
    setSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-zim-gold/30 selection:text-slate-900 font-sans">
      
      {/* --- INTEGRATED GLASS CEILING --- */}
      <header 
        className={`fixed top-0 left-0 right-0 z-[210] transition-all duration-500 border-b ${
          (scrolled && !mobileMenuOpen) 
            ? 'bg-slate-900/95 backdrop-blur-xl border-white/10 py-1 shadow-2xl' 
            : 'bg-transparent border-transparent py-4'
        }`}
      >
        <div className="container mx-auto px-6 h-14 flex items-center justify-between relative">
          
          {/* 1. Left Section: Logo & Brand (Flexible width to push menu center) */}
          <div className="flex-1 lg:flex-none lg:min-w-[200px] flex items-center">
            <Link href='/'>
                <div className={`flex items-center space-x-3 cursor-pointer transition-all duration-500 ${
                  (scrolled || mobileMenuOpen) 
                    ? 'opacity-100 translate-x-4' 
                    : 'opacity-0 -translate-x-4 pointer-events-none'
                }`}>
                <img
                  src='/images/made_in_zimbabwe.png'
                  alt='Logo'
                  className="h-9 w-9 object-contain"
                />
              </div>
            </Link>
          </div>

          {/* 2. Middle Section: Desktop Navigation (Absolute Center) */}
          <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center">
            <div className={`
              relative flex items-center gap-1 p-1 px-10 rounded-full transition-all duration-700 overflow-hidden
              ${scrolled 
                ? 'bg-slate-900/90 backdrop-blur-md border border-white/10' 
                : 'bg-white/[0.08] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)]' 
              }
            `}>
              {/* The Crispy Edge Finish (Only visible when not scrolled) */}
              {!scrolled && (
                <span className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
              )}

              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <button className={`
                      relative z-10 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500
                      ${active 
                          ? 'text-yellow-400 bg-yellow-400/10 shadow-[0_0_20px_rgba(250,204,21,0.3)]' 
                          : scrolled 
                            ? 'text-white/70 hover:text-yellow-400 hover:bg-yellow-400/5' 
                            : 'text-white/60 hover:text-yellow-400 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                      }
                    `}>
                      {item.name}
                    </button>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* 3. Right Section: Utility Icons (Pushed to the far end) */}
          <div className="flex items-center justify-end gap-1 md:gap-2 flex-1 lg:flex-none lg:min-w-[200px]">
            {/* Search Tool */}
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden sm:flex text-white/60 hover:text-yellow-400 rounded-full transition-colors h-9 w-9">
                  <Search className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900/95 backdrop-blur-3xl border-white/10 text-white rounded-3xl p-6 shadow-2xl">
                <form onSubmit={handleSearch} className="relative group mt-4">
                  <input
                    placeholder={t('search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-400 outline-none transition-all"
                    autoFocus
                  />
                </form>
              </DialogContent>
            </Dialog>

            {/* Desktop Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* FIX: Added !isMenuOpen check (assuming your state name) 
                  and ensured hidden is the default for mobile 
                */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`
                    ${mobileMenuOpen ? 'hidden' : 'hidden md:flex'} 
                    text-white/60 hover:text-yellow-400 rounded-full h-9 w-9
                  `}
                >
                  <Globe className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900/95 backdrop-blur-3xl border-white/10 text-white rounded-2xl p-2 shadow-2xl min-w-[12rem]">
                {languages.map((lang) => (
                  <DropdownMenuItem key={lang.code} onClick={() => i18n.changeLanguage(lang.code)} className="cursor-pointer hover:bg-white/10 py-2 font-bold text-[10px] uppercase tracking-widest rounded-xl">
                    <span className="mr-3 text-base">{lang.flag}</span> {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Account Icon (VISIBLE ON BOTH MOBILE & DESKTOP) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-yellow-400 rounded-full h-9 w-9 transition-colors">
                  <User className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent 
                align="end" 
                className="bg-slate-900/95 backdrop-blur-3xl border-white/10 text-white rounded-2xl p-2 shadow-2xl min-w-[12rem] z-[100]"
              >
                <DropdownMenuLabel className="text-white/40 font-black text-[10px] uppercase tracking-widest px-3 py-2">
                  {t('account')}
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator className="bg-white/10" />

                {/* Login Link */}
                <Link href="/login">
                  <DropdownMenuItem className="cursor-pointer rounded-xl hover:bg-white/10 py-2.5 px-3 text-sm transition-colors duration-200 outline-none">
                    <div className="flex items-center gap-2 w-full">
                      {t('login')}
                    </div>
                  </DropdownMenuItem>
                </Link>

                {/* Register Link - Cinematic Gold Highlight */}
                <Link href="/register">
                  <DropdownMenuItem className="cursor-pointer rounded-xl hover:bg-zim-gold hover:text-zim-black py-2.5 px-3 text-sm font-bold transition-all duration-300 outline-none">
                    <div className="flex items-center gap-2 w-full">
                      {t('register')}
                    </div>
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle (Burger turns to X) */}
            <Button
              variant="ghost"
              size="icon"
              className={`lg:hidden rounded-full h-10 w-10 transition-all duration-300 z-[220] ${
                mobileMenuOpen 
                  ? 'bg-yellow-400 text-slate-950 scale-105 shadow-lg' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <motion.div
                key={mobileMenuOpen ? "open" : "closed"}
                initial={{ opacity: 0, rotate: -45 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ duration: 0.2 }}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.div>
            </Button>
          </div>
        </div>
      </header>

      {/* --- MOBILE FLASH PANEL (Aligned with Menu Bar) --- */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[190] lg:hidden" 
              onClick={() => setMobileMenuOpen(false)} 
            />

            {/* Slide-out Menu */}
            <motion.div 
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed top-14 right-0 w-72 z-[200] pointer-events-none"
            >
              <div className="pointer-events-auto bg-slate-900/98 backdrop-blur-md border-l border-b border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
                
                <div className="p-4 space-y-4 overflow-y-auto">
                  {/* Header label with tiny font */}
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3">
                    Navigation
                  </p>
                  
                  <nav className="flex flex-col space-y-1">
                    {navigation.map((item, index) => (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: 5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Link href={item.href}>
                          <Button
                            variant="ghost"
                            className={`w-full justify-start text-sm font-medium h-11 rounded-xl transition-all ${
                              isActive(item.href) 
                                ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20" 
                                : "text-white/70 hover:bg-white/5"
                            }`}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {item.name}
                          </Button>
                        </Link>
                      </motion.div>
                    ))}
                  </nav>

                  {/* Language Switcher - Flag Only Grid */}
                  <div className="border-t border-white/10 pt-4 pb-2">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3 px-3">
                      {t('select_lang')}
                    </p>
                    <div className="grid grid-cols-4 gap-2 px-1">
                      {languages.map((lang) => (
                        <Button
                          key={lang.code}
                          variant="ghost"
                          title={lang.name}
                          className={`h-10 flex items-center justify-center rounded-xl border transition-all ${
                            i18n.language === lang.code 
                              ? "bg-yellow-400/20 border-yellow-400/40" 
                              : "bg-white/5 border-white/10 text-white/60"
                          }`}
                          onClick={() => {
                            i18n.changeLanguage(lang.code);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <span className="text-xl">{lang.flag}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full pt-0 relative z-0">
        {children}
      </main>

     {/* Footer */}
      <footer className="relative bg-slate-950 pt-20 pb-12 overflow-hidden">
        {/* Accents & Textures */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[url('/images/carbon-fibre.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

        <div className="container mx-auto px-6">
          {/* Main Grid: flex-col on mobile, grid on larger screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            
            {/* About Column */}
            <div className="space-y-4">
              <h3 className="text-white text-[10px] font-black uppercase tracking-widest">
                {t('about')} {t('brand')}
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
                {t('about_us')}
              </p>
            </div>

            {/* Quick Links Column */}
            <div className="space-y-4">
              <h3 className="text-white text-[10px] font-black uppercase tracking-widest">
                {t('quick_links')}
              </h3>
              <ul className="space-y-2 text-xs">
                {navigation
                  .filter((link) => 
                    !["/", "/success-stories", "/data-visualization"].includes(link.href)
                  )
                  .map((link) => (
                   <li key={link.href} className="leading-tight">
                      <Link href={link.href}>
                        <span className="text-slate-400 text-[10px] hover:text-yellow-400 transition-colors font-bold uppercase tracking-widest cursor-pointer">
                          {link.name}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>

            {/* Partners Column */}
            <div className="space-y-4">
              <h3 className="text-white text-[10px] font-black uppercase tracking-widest">
                {t('partners')}
              </h3>
              <ul className="text-slate-400 space-y-2 text-xs">
                <li><a href="https://zimbabwetourism.net/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Zimbabwe Tourism</a></li>
                <li><a href="https://zidainvest.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">ZIDA Invest</a></li>
                <li><a href="https://tradezimbabwe.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">ZimTrade</a></li>
                <li><a href="https://www.ictministry.gov.zw/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Ministry Of ICT</a></li>
                <li><a href="https://www.zimra.co.zw/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">ZIMRA</a></li>
              </ul>
            </div>

            {/* Contact Column */}
            <div className="space-y-4">
              <h3 className="text-white text-[10px] font-black uppercase tracking-widest">
                {t('contact')}
              </h3>
              <ul className="text-slate-400 space-y-3 text-xs">
                <li className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-yellow-400" />
                  <a href="mailto:info@diasporaunlocked.com" className="hover:text-white transition-colors">info@diasporaunlocked.com</a>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-yellow-400" />
                  <a href="tel:+4915147416152" className="hover:text-white transition-colors">+49 151 474 16152</a>
                </li>
                <li className="flex items-center gap-3 opacity-90">
                  <MapPin className="h-4 w-4 text-yellow-400" />
                  <span>Berlin, Germany</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Maintain horizontal flex on desktop, vertical on mobile */}
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px]">
            <p className="text-slate-500 font-medium">
              © 2026 {t('brand')}. {t('all_rights_reserved')}
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-slate-500 hover:text-white transition-colors uppercase tracking-widest font-bold">
                {t('privacy_policy')}
              </a>
              <a href="#" className="text-slate-500 hover:text-white transition-colors uppercase tracking-widest font-bold">
                {t('terms_of_service')}
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* FAB */}
      <a href="https://wa.me/+4915147416152" target="_blank" className="fixed bottom-10 right-10 z-[100] group">
        <div className="relative">
          <div className="absolute inset-0 bg-green-500 rounded-full blur-2xl group-hover:blur-3xl transition-all opacity-20" />
          <button className="relative bg-green-500 hover:bg-green-400 text-white p-5 rounded-full shadow-2xl transition-all group-hover:scale-110 active:scale-95 border border-white/20"><MessageCircle className="h-7 w-7" /></button>
        </div>
      </a>
    </div>
  );
}