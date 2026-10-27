import { customerLanguage } from "@shared/customerLanguage";
import ContactEnquiry from "./ContactEnquiry";
import ThemeSwitcher from "./ThemeSwitcher";
import { Link, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  Search,
  User,
  Globe,
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  LogOut,
  House,
  ShoppingBag,
  Landmark,
  Compass,
  Brain,
  ChevronRight,
} from "lucide-react";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  api,
  clearAuthToken,
  getApiErrorMessage,
  type AuthUser,
} from "@/lib/api";
import {
  clearCurrentUserBootstrap,
  resolveCurrentUserBootstrap,
} from "@/lib/authSessionBootstrap";
import { setAppLanguage } from "@/i18n";
import RouteSeo from "@/components/RouteSeo";
import { preloadNavigationImage } from "@/lib/navigationImages";

interface LayoutProps {
  children: React.ReactNode;
}

type BrowserLayoutProfile = {
  enterBuffer: number;
  exitBuffer: number;
  edgeRightPx: number;
  horizontalReservedPx: number;
};

const DEFAULT_BROWSER_LAYOUT_PROFILE: BrowserLayoutProfile = {
  enterBuffer: 8,
  exitBuffer: 2,
  edgeRightPx: 8,
  horizontalReservedPx: 128,
};

function getBrowserLayoutProfile(userAgent: string): BrowserLayoutProfile {
  const ua = userAgent.toLowerCase();
  const isEdge = ua.includes("edg/");
  const isFirefox = ua.includes("firefox/");
  const isSafari = ua.includes("safari/") && !ua.includes("chrome/") && !isEdge;

  if (isEdge) {
    return {
      enterBuffer: 12,
      exitBuffer: 2,
      edgeRightPx: 8,
      horizontalReservedPx: 132,
    };
  }
  if (isFirefox) {
    return {
      enterBuffer: 11,
      exitBuffer: 3,
      edgeRightPx: 6,
      horizontalReservedPx: 132,
    };
  }
  if (isSafari) {
    return {
      enterBuffer: 12,
      exitBuffer: 3,
      edgeRightPx: 8,
      horizontalReservedPx: 132,
    };
  }
  return DEFAULT_BROWSER_LAYOUT_PROFILE;
}

export function getDesktopUtilityIconsClass(useEdgePosition: boolean): string {
  if (useEdgePosition) {
    return "flex items-center gap-0 md:gap-0.5 lg:fixed lg:top-2 lg:flex lg:flex-col lg:items-end lg:gap-1.5";
  }
  return "flex items-center gap-0 md:gap-0.5";
}

export default function Layout({ children }: LayoutProps) {
  type AboutSectionId = "vision" | "mission" | "values" | "who" | "what";
  const { t, i18n } = useTranslation();
  const tr = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback });
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterFeedback, setNewsletterFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [desktopViewportWidth, setDesktopViewportWidth] = useState(() => {
    if (typeof window === "undefined") return 1440;
    return window.innerWidth;
  });
  const [useEdgeIconColumn, setUseEdgeIconColumn] = useState(false);
  const [browserLayoutProfile, setBrowserLayoutProfile] =
    useState<BrowserLayoutProfile>(DEFAULT_BROWSER_LAYOUT_PROFILE);
  const [activeAboutSection, setActiveAboutSection] =
    useState<AboutSectionId | null>(null);
  const [homeHeroLogoVisible, setHomeHeroLogoVisible] = useState(true);
  const scrolledRef = useRef(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const navPillRef = useRef<HTMLDivElement | null>(null);
  const utilitySlotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Throttle scroll-driven header state updates via RAF to avoid excessive re-renders.
    let rafId = 0;
    const updateScrolledState = () => {
      rafId = 0;
      const nextScrolled = window.scrollY > 10;
      if (nextScrolled !== scrolledRef.current) {
        scrolledRef.current = nextScrolled;
        setScrolled(nextScrolled);
      }
    };

    const handleScroll = () => {
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(updateScrolledState);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // Sync mobile menu close with route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setLanguageMenuOpen(false);
    setAccountMenuOpen(false);
  }, [location]);

  useEffect(() => {
    let mounted = true;
    const fetchMe = async () => {
      try {
        const nextUser = await resolveCurrentUserBootstrap();
        if (mounted) setUser(nextUser);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };
    fetchMe();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      clearCurrentUserBootstrap();
      clearAuthToken();
      setUser(null);
      setLocation("/", { replace: true });
    } catch {
      toast.error(
        tr("account.logout_failed", "Unable to sign out. Please try again.")
      );
    }
  };

  const navigation = [
    { name: tr("nav.home", "Home"), href: "/", icon: House },
    { name: tr("nav.shop", "Shop"), href: "/shop", icon: ShoppingBag },
    {
      name: tr("nav.technology", "Technology"),
      href: "/technology",
      icon: Brain,
    },
    {
      name: tr("nav.investment", "Investment"),
      href: "/investment",
      matchPaths: ["/investment", "/ntir"],
      icon: Landmark,
    },
    { name: tr("nav.tourism", "Travel"), href: "/travel", icon: MapPin },
  ];
  const mobileTopNavigation = [
    { name: tr("nav.home", "Home"), href: "/", icon: House },
    { name: tr("nav.shop", "Shop"), href: "/shop", icon: ShoppingBag },
    {
      name: tr("nav.technology", "Technology"),
      href: "/technology",
      icon: Brain,
    },
    {
      name: tr("nav.tourism", "Travel"),
      href: "/travel",
      matchPaths: ["/travel"],
      icon: Compass,
    },
    {
      name: tr("nav.investment", "Invest"),
      href: "/investment",
      matchPaths: ["/investment", "/ntir"],
      icon: Landmark,
    },
  ];
  const languages = [
    { name: "English", flag: "🇬🇧", code: "en" },
    { name: "chiShona", flag: "🇿🇼", code: "sn" },
    { name: "isiNdebele", flag: "🇿🇼", code: "nd" },
    { name: "Deutsch", flag: "🇩🇪", code: "de" },
  ];

  const isActive = (item: { href: string; matchPaths?: string[] }) => {
    const paths = item.matchPaths ?? [item.href];
    return paths.some(path =>
      path === "/" ? location === "/" : location.startsWith(path)
    );
  };
  const isHomePage = location === "/";
  const isAuthPage =
    location === "/login" ||
    location === "/register" ||
    location === "/forgot-password" ||
    location === "/reset-password";
  const isMobileNavHiddenPage = isAuthPage || location === "/onesa-ai-chat";
  const isCompactNavViewport = desktopViewportWidth < 1024;
  const shouldShowNavbarLogo =
    !isCompactNavViewport && (!isHomePage || !homeHeroLogoVisible);
  const useHomeCompactTransparentNav =
    isCompactNavViewport && isHomePage && !mobileMenuOpen && !scrolled;
  const hasHeroSection =
    isHomePage ||
    location === "/investment" ||
    location.startsWith("/travel") ||
    location === "/shop" ||
    location === "/technology";
  const useDesktopTransparentNav =
    !isCompactNavViewport && hasHeroSection && !scrolled;
  const mainTopPaddingClass = isCompactNavViewport
    ? isHomePage
      ? "pt-0"
      : isMobileNavHiddenPage
        ? "pt-[env(safe-area-inset-top)]"
        : "pt-[calc(3.5rem+env(safe-area-inset-top))]"
    : "pt-0";
  const mainBottomPaddingClass = "";
  const mainViewportOffsetsStyle: CSSProperties | undefined =
    isCompactNavViewport
      ? ({
          "--mobile-shell-offset-top": isHomePage
            ? "0px"
            : isMobileNavHiddenPage
              ? "env(safe-area-inset-top)"
              : "calc(3.5rem + env(safe-area-inset-top))",
          "--mobile-shell-offset-bottom": "0px",
        } as CSSProperties)
      : undefined;

  const handleNewsletterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newsletterSubmitting) return;

    try {
      setNewsletterSubmitting(true);
      setNewsletterFeedback(null);

      const { data } = await api.post("/notifications/newsletter", {
        language: customerLanguage(i18n.resolvedLanguage ?? i18n.language),
        email: newsletterEmail.trim(),
        consent: true,
      });

      setNewsletterFeedback({
        kind: "success",
        message: data?.deliveryPending
          ? tr(
              "footer.newsletter.delivery_pending",
              "Subscription request saved. Email delivery is temporarily unavailable. If no confirmation arrives, try subscribing again later."
            )
          : tr(
              "footer.newsletter.confirmation_sent",
              "Check your email for a confirmation link. If you have already confirmed, you are on the list."
            ),
      });
      setNewsletterEmail("");
    } catch (error) {
      setNewsletterFeedback({
        kind: "error",
        message: getApiErrorMessage(
          error,
          tr("footer.newsletter.error", "Unable to subscribe right now.")
        ),
      });
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  const evaluateUtilityOverlap = useCallback(() => {
    if (typeof window === "undefined") return;

    if (window.innerWidth < 1024) {
      setUseEdgeIconColumn(false);
      return;
    }

    const navRect = navPillRef.current?.getBoundingClientRect();
    const utilitySlotRect = utilitySlotRef.current?.getBoundingClientRect();
    if (!navRect || !utilitySlotRect) {
      setUseEdgeIconColumn(false);
      return;
    }

    // Project icon block in its horizontal position inside the right slot, then check overlap.
    // Edge (Chromium) can report slightly different text/icon widths, so use a conservative buffer.
    const projectedIconsLeft =
      utilitySlotRect.right - browserLayoutProfile.horizontalReservedPx;
    setUseEdgeIconColumn(isCurrentlyEdgeColumn => {
      if (isCurrentlyEdgeColumn) {
        // Return to original horizontal state as soon as overlap clears with a small hysteresis.
        const canReturnHorizontal =
          navRect.right < projectedIconsLeft - browserLayoutProfile.exitBuffer;
        return !canReturnHorizontal;
      }

      // Switch to vertical only when horizontal layout would overlap.
      const hasProjectedOverlap =
        navRect.right >= projectedIconsLeft - browserLayoutProfile.enterBuffer;
      return hasProjectedOverlap;
    });
  }, [
    browserLayoutProfile.enterBuffer,
    browserLayoutProfile.exitBuffer,
    browserLayoutProfile.horizontalReservedPx,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBrowserLayoutProfile(
      getBrowserLayoutProfile(window.navigator.userAgent)
    );
  }, []);

  useEffect(() => {
    const onResize = () => {
      setDesktopViewportWidth(window.innerWidth);
      if (window.innerWidth >= 1024) {
        // Prevent stale mobile menu state from hiding utility icons after resizing to desktop.
        setMobileMenuOpen(false);
      }
      evaluateUtilityOverlap();
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [evaluateUtilityOverlap]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(evaluateUtilityOverlap);
    return () => window.cancelAnimationFrame(rafId);
  }, [location, desktopViewportWidth, evaluateUtilityOverlap]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => evaluateUtilityOverlap());
    if (navPillRef.current) observer.observe(navPillRef.current);
    if (utilitySlotRef.current) observer.observe(utilitySlotRef.current);
    return () => observer.disconnect();
  }, [evaluateUtilityOverlap]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isHomePage) {
      setHomeHeroLogoVisible(false);
      return;
    }

    const checkVisibility = () => {
      const el = document.getElementById("home-hero-logo");
      // Element missing or hidden (display:none) — fall back to scroll position
      if (!el || el.offsetParent === null) {
        setHomeHeroLogoVisible(window.scrollY < 80);
        return;
      }
      const rect = el.getBoundingClientRect();
      setHomeHeroLogoVisible(rect.bottom > 0 && rect.top < window.innerHeight);
    };

    // Delay slightly so framer-motion has time to mount the element
    const timer = setTimeout(checkVisibility, 150);
    window.addEventListener("scroll", checkVisibility, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", checkVisibility);
    };
  }, [isHomePage, location]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
    setSearchOpen(false);
    setSearchQuery("");
  };

  const aboutSections: Array<{
    id: AboutSectionId;
    label: string;
    content: string;
  }> = [
    {
      id: "vision",
      label: t("footer.about.vision_label", { defaultValue: "Our Vision" }),
      content: t("footer.about.vision_content", {
        defaultValue:
          "Make it easier to stay connected to Zimbabwe, wherever you live.",
      }),
    },
    {
      id: "mission",
      label: t("footer.about.mission_label", { defaultValue: "Our Mission" }),
      content: t("footer.about.mission_content", {
        defaultValue:
          "Bring Zimbabwean products, travel information, project profiles and practical AI help into one place.",
      }),
    },
    {
      id: "values",
      label: t("footer.about.values_label", { defaultValue: "Our Values" }),
      content: t("footer.about.values_content", {
        defaultValue:
          "Clear information, useful guidance and honest explanations of what is available.",
      }),
    },
    {
      id: "who",
      label: t("footer.about.who_label", { defaultValue: "Who we are" }),
      content: t("footer.about.who_content", {
        defaultValue:
          "Diaspora Unlocked connects people in Zimbabwe and abroad with products, travel information, business ideas and practical AI assistance.",
      }),
    },
    {
      id: "what",
      label: t("footer.about.what_label", { defaultValue: "What we do" }),
      content: t("footer.about.what_content", {
        defaultValue:
          "Build a basket and request an order, research a business idea, draft a trip plan or ask Onesa a question. Explore the sections to choose your next step.",
      }),
    },
  ];
  const activeAbout = activeAboutSection
    ? (aboutSections.find(section => section.id === activeAboutSection) ?? null)
    : null;

  return (
    <div
      data-page-variant={isHomePage ? "home" : "content"}
      data-page-path={location}
      className={`${isHomePage ? "" : "content-page "}min-h-screen flex flex-col bg-slate-950 selection:bg-zim-gold/30 selection:text-slate-900 font-sans`}
    >
      <RouteSeo pathname={location} search={search} />
      {/* Skip to main content — visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-full focus:bg-zim-gold focus:px-5 focus:py-2.5 focus:text-[11px] focus:font-black focus:uppercase focus:tracking-widest focus:text-zim-black focus:shadow-xl"
      >
        Skip to main content
      </a>

      {/* --- INTEGRATED GLASS CEILING --- */}
      <header
        className={`site-header hidden lg:block fixed top-0 left-0 right-0 z-[210] pt-[env(safe-area-inset-top)] transition-colors duration-200 ${
          useHomeCompactTransparentNav
            ? "bg-transparent border-transparent py-0"
            : useDesktopTransparentNav
              ? "border-b bg-slate-900/95 backdrop-blur-xl border-white/10 py-0 lg:py-4 lg:bg-transparent lg:border-transparent"
              : "border-b bg-slate-900/95 backdrop-blur-xl border-white/10 py-0 lg:py-4"
        }`}
      >
        <div className="container mx-auto px-6 h-14 flex items-center justify-between relative">
          {/* 1. Left Section: Logo & Brand (Flexible width to push menu center) */}
          <div className="flex-1 lg:flex-none lg:min-w-[200px] flex items-center">
            <Link href="/">
              <div
                className={`hidden lg:flex items-center space-x-3 cursor-pointer transition-all duration-500 ${
                  shouldShowNavbarLogo
                    ? "opacity-100 translate-x-4 lg:translate-x-0 lg:pointer-events-auto"
                    : "opacity-0 -translate-x-4 pointer-events-none lg:opacity-0 lg:-translate-x-4 lg:pointer-events-none"
                }`}
              >
                <div className="relative inline-flex h-10 w-10 items-center justify-center">
                  <span className="pointer-events-none absolute inset-0 rounded-[0.95rem] border border-white/25 lg:border-white/30 bg-slate-950/30 lg:bg-white/15 backdrop-blur-md shadow-[0_12px_30px_rgba(0,0,0,0.35)] lg:shadow-[0_12px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)]" />
                  <img
                    src="/images/brand/diaspora_unlocked_336.webp"
                    alt="Logo"
                    className="relative h-[2.35rem] w-[2.35rem] scale-[1.12] object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)] lg:h-[2.35rem] lg:w-[2.35rem] lg:scale-[1.12] lg:drop-shadow-[0_7px_14px_rgba(0,0,0,0.55)]"
                  />
                </div>
              </div>
            </Link>
          </div>

          {/* 2. Middle Section: Desktop Navigation (Absolute Center) */}
          <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center">
            <div
              ref={navPillRef}
              className={`
              relative flex items-center gap-1 p-1 px-4 rounded-full overflow-hidden h-14
              bg-slate-900/90 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.1)]
            `}
            >
              <span className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />

              {navigation.map(item => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onPointerEnter={() => preloadNavigationImage(item.href)}
                    onFocus={() => preloadNavigationImage(item.href)}
                    onTouchStart={() => preloadNavigationImage(item.href)}
                    aria-current={active ? "page" : undefined}
                    className={`
                      relative z-10 inline-flex min-h-11 items-center px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-[0.1em] transition-colors duration-200 whitespace-nowrap
                      ${
                        active
                          ? "text-yellow-400 bg-yellow-400/10 shadow-[0_0_20px_rgba(250,204,21,0.3)]"
                          : "text-white/70 hover:text-yellow-400 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(250,204,21,0.2)]"
                      }
                    `}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* 3. Right Section: Utility Icons (Pushed to the far end) */}
          <div
            ref={utilitySlotRef}
            className="relative z-[230] flex items-center justify-end flex-1 lg:flex-none lg:min-w-[200px] pointer-events-none"
          >
            <div
              className={`${getDesktopUtilityIconsClass(useEdgeIconColumn)} pointer-events-auto`}
              style={
                useEdgeIconColumn
                  ? { right: `${browserLayoutProfile.edgeRightPx}px` }
                  : undefined
              }
            >
              {/* Search Tool (Desktop only trigger; dialog rendered below) */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex text-white/70 hover:text-yellow-400 rounded-full transition-colors h-11 w-11"
                aria-label={tr(
                  "search.results.title_default",
                  "Search Diaspora Unlocked"
                )}
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>

              <DropdownMenu
                open={languageMenuOpen}
                onOpenChange={open => {
                  setLanguageMenuOpen(open);
                  if (open) {
                    setAccountMenuOpen(false);
                  }
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("nav.language_hint", {
                      defaultValue: "Use the globe icon to change language.",
                    })}
                    className={`
                    ${mobileMenuOpen ? "hidden" : "hidden md:flex"}
                    text-white/70 hover:text-yellow-400 rounded-full h-11 w-11
                  `}
                  >
                    <Globe className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="z-[260] min-w-[12rem] rounded-2xl border-white/10 bg-slate-900/95 p-2 text-white shadow-2xl backdrop-blur-3xl"
                >
                  {languages.map(lang => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => {
                        void setAppLanguage(lang.code);
                        setLanguageMenuOpen(false);
                      }}
                      className="cursor-pointer rounded-xl py-2 font-bold text-[10px] uppercase tracking-widest hover:bg-white/10"
                    >
                      <span className="mr-3 text-base">{lang.flag}</span>{" "}
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Account Icon (VISIBLE ON BOTH MOBILE & DESKTOP) */}
              <DropdownMenu
                open={accountMenuOpen}
                onOpenChange={open => {
                  setAccountMenuOpen(open);
                  if (open) {
                    setLanguageMenuOpen(false);
                  }
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={tr("account.title", "Account")}
                    className="hidden lg:flex text-white/70 hover:text-yellow-400 rounded-full h-11 w-11 transition-colors"
                  >
                    <User className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="z-[260] min-w-[12rem] rounded-2xl border-white/10 bg-slate-900/95 p-2 text-white shadow-2xl backdrop-blur-3xl"
                >
                  <DropdownMenuLabel className="text-white/70 font-black text-[10px] uppercase tracking-widest px-3 py-2">
                    {user ? user.fullName : tr("account.title", "Account")}
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator className="bg-white/10" />

                  {authLoading ? (
                    <DropdownMenuItem className="rounded-xl py-2.5 px-3 cursor-default">
                      <div
                        aria-hidden="true"
                        className="h-4 w-24 rounded bg-white/15 animate-pulse"
                      />
                    </DropdownMenuItem>
                  ) : user ? (
                    <>
                      <DropdownMenuItem
                        asChild
                        className="cursor-pointer rounded-xl hover:bg-white/10 py-2.5 px-3 text-sm transition-colors duration-200 outline-none"
                      >
                        <Link href="/admin">{tr("nav.admin", "Admin")}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer rounded-xl hover:bg-white/10 py-2.5 px-3 text-sm transition-colors duration-200 outline-none"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <LogOut className="h-4 w-4" />
                          {tr("account.logout", "Logout")}
                        </div>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem
                        asChild
                        className="cursor-pointer rounded-xl hover:bg-white/10 py-2.5 px-3 text-sm transition-colors duration-200 outline-none"
                      >
                        <Link href="/login">{t("login")}</Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        asChild
                        className="cursor-pointer rounded-xl hover:bg-zim-gold hover:text-zim-black py-2.5 px-3 text-sm font-bold transition-all duration-300 outline-none"
                      >
                        <Link href="/register">{t("register")}</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* --- Search Dialog --- */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="bg-slate-900/95 backdrop-blur-3xl border-white/10 text-white rounded-3xl p-6 shadow-2xl">
          <DialogTitle>
            {tr("search.results.title_default", "Search Diaspora Unlocked")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {tr(
              "search.description",
              "Find products, destinations, business ideas and Onesa tools."
            )}
          </DialogDescription>
          <form onSubmit={handleSearch} className="relative group mt-4">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-400 outline-none transition-all"
              aria-label="Search"
              autoFocus
            />
            <Button type="submit" className="mt-3 bg-zim-gold text-zim-black">
              {tr("search.submit", "Search")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent
          data-placement="menu"
          className="lg:hidden top-[calc(4rem+env(safe-area-inset-top))] left-auto right-3 w-[min(20rem,calc(100vw-1.5rem))] translate-x-0 translate-y-0 max-h-[calc(100svh-5rem)] overflow-y-auto rounded-2xl border-white/10 bg-slate-900 p-2 pt-10 text-white"
          aria-describedby={undefined}
          onCloseAutoFocus={event => {
            event.preventDefault();
            mobileMenuButtonRef.current?.focus();
          }}
        >
          <DialogTitle className="sr-only">
            {tr("nav.menu", "Navigation menu")}
          </DialogTitle>
          <nav
            aria-label={tr("nav.menu", "Navigation menu")}
            className="grid gap-1 px-4"
          >
            {navigation.map(item => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item) ? "page" : undefined}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/85 hover:bg-white/10 focus-visible:bg-white/10"
              >
                <item.icon
                  className="size-4 text-zim-gold"
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 space-y-4 overflow-y-auto">
            <div className="pt-1 pb-2">
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-3 px-3">
                {t("search_title", { defaultValue: "Search" })}
              </p>
              <form
                onSubmit={e => {
                  handleSearch(e);
                  setMobileMenuOpen(false);
                }}
                className="px-1"
              >
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <Search className="h-4 w-4 text-white/60" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    aria-label={tr(
                      "search.results.title_default",
                      "Search Diaspora Unlocked"
                    )}
                    className="w-full bg-transparent text-sm text-white/90 placeholder:text-white/50 outline-none"
                  />
                </div>
              </form>
            </div>

            <div className="pt-2 pb-2">
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-3 px-3">
                {tr("account.title", "Account")}
              </p>
              <div className="space-y-2 px-1">
                {authLoading ? (
                  <div className="h-9 w-full rounded-xl border border-white/10 bg-white/10 animate-pulse" />
                ) : user ? (
                  <>
                    <Button
                      asChild
                      variant="ghost"
                      className="h-9 w-full justify-start rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/admin">{tr("nav.admin", "Admin")}</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-9 w-full justify-start rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
                      onClick={() => {
                        void handleLogout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      {tr("account.logout", "Logout")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      asChild
                      variant="ghost"
                      className="h-9 w-full justify-start rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/login">{t("login")}</Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      className="h-9 w-full justify-start rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/register">{t("register")}</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="pt-2 pb-2">
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-3 px-3">
                {t("select_lang")}
              </p>
              <div className="space-y-2 px-1">
                {languages.map(lang => (
                  <Button
                    key={lang.code}
                    variant="ghost"
                    title={lang.name}
                    className={`h-9 w-full justify-start rounded-xl border px-3 text-sm font-semibold transition-all ${
                      i18n.language === lang.code
                        ? "border-yellow-400/40 bg-yellow-400/20 text-yellow-300"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => {
                      void setAppLanguage(lang.code);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <span className="mr-3 text-base">{lang.flag}</span>
                    {lang.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {!isMobileNavHiddenPage && (
        <div className="fixed left-0 right-0 z-[205] lg:hidden top-0">
          <div
            className={`flex h-[calc(3.5rem+env(safe-area-inset-top))] items-end border-b border-white/10 px-1 pt-[env(safe-area-inset-top)] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] ${
              useHomeCompactTransparentNav
                ? "bg-slate-950/80"
                : "bg-slate-900/95"
            }`}
          >
            <nav className="flex h-14 w-full items-center justify-around">
              {mobileTopNavigation.map(item => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onPointerEnter={() => preloadNavigationImage(item.href)}
                    onFocus={() => preloadNavigationImage(item.href)}
                    onTouchStart={() => preloadNavigationImage(item.href)}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.name}
                    title={item.name}
                    className={`flex min-h-11 min-w-0 flex-1 flex-col gap-0.5 items-center justify-center transition-colors ${
                      active
                        ? "text-yellow-400"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    {item.href === "/" ? (
                      isHomePage && homeHeroLogoVisible ? (
                        <House className="h-5 w-5" strokeWidth={2} />
                      ) : (
                        <img
                          src="/images/brand/diaspora_unlocked_336.webp"
                          alt={item.name}
                          className="h-5 w-5 object-contain"
                        />
                      )
                    ) : (
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    )}
                    <span className="max-w-full truncate text-[8px] min-[360px]:text-[9px] font-semibold">
                      {item.name}
                    </span>
                  </Link>
                );
              })}
              <button
                type="button"
                ref={mobileMenuButtonRef}
                aria-expanded={mobileMenuOpen}
                aria-haspopup="dialog"
                aria-label={
                  mobileMenuOpen
                    ? t("nav.close_menu", { defaultValue: "Close menu" })
                    : t("nav.open_menu", { defaultValue: "Open menu" })
                }
                className={`flex min-h-11 flex-1 items-center justify-center transition-all duration-300 ${
                  mobileMenuOpen
                    ? "text-yellow-400"
                    : "text-white/60 hover:text-white"
                }`}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <motion.div
                  key={mobileMenuOpen ? "open" : "closed"}
                  initial={{ opacity: 0, rotate: -45 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </motion.div>
              </button>
            </nav>
          </div>
        </div>
      )}

      <main
        id="main-content"
        tabIndex={-1}
        className={`relative z-0 flex-1 w-full ${mainTopPaddingClass} ${mainBottomPaddingClass}`}
        style={mainViewportOffsetsStyle}
      >
        {children}
      </main>

      <Dialog
        open={Boolean(activeAbout)}
        onOpenChange={open => {
          if (!open) setActiveAboutSection(null);
        }}
      >
        <DialogContent
          className="rounded-2xl border-white/15 bg-slate-900 p-6 text-white"
          aria-describedby={undefined}
        >
          <DialogTitle>{activeAbout?.label}</DialogTitle>
          <p className="text-sm leading-relaxed text-white/80 whitespace-pre-line">
            {activeAbout?.content}
          </p>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="site-footer bg-slate-950 pt-14 pb-12">
        <div className="container mx-auto px-6">
          {/* Footer information and contact grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 mb-12 lg:grid-cols-[0.8fr_0.8fr_1.25fr_1.15fr]">
            {/* About Column */}
            <div className="space-y-4">
              <h3 className="text-white text-[10px] font-black uppercase tracking-widest">
                {t("footer.about.title", { defaultValue: "About us" })}
              </h3>
              <ul className="text-slate-400 space-y-2 text-xs">
                {aboutSections.map(section => (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => setActiveAboutSection(section.id)}
                      className={`text-left transition-colors ${
                        activeAboutSection === section.id
                          ? "text-white"
                          : "hover:text-white"
                      }`}
                    >
                      {section.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Links Column */}
            <div className="space-y-4">
              <h3 className="text-white text-[10px] font-black uppercase tracking-widest">
                {t("quick_links")}
              </h3>
              <ul className="space-y-2 text-xs">
                {navigation
                  .filter(link => link.href !== "/")
                  .map(link => (
                    <li key={link.href} className="leading-tight">
                      <Link href={link.href}>
                        <span className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                          {link.name}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>

            {/* Newsletter Column */}
            <div className="col-span-2 sm:col-span-1 min-w-0 space-y-4">
              <h3 className="text-white text-[10px] font-black uppercase tracking-widest">
                {tr("footer.newsletter.title", "Newsletter")}
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  {tr(
                    "footer.newsletter.description",
                    "Zimbabwean products, travel ideas and platform news by email."
                  )}
                </p>
                <form
                  className="flex min-w-0 flex-row items-center gap-2"
                  onSubmit={handleNewsletterSubmit}
                >
                  <input
                    type="email"
                    aria-label={tr(
                      "footer.newsletter.email_placeholder",
                      "Email address"
                    )}
                    value={newsletterEmail}
                    onChange={event => setNewsletterEmail(event.target.value)}
                    placeholder={tr(
                      "footer.newsletter.email_placeholder",
                      "Email address"
                    )}
                    required
                    autoComplete="email"
                    className="min-w-0 flex-1 h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={newsletterSubmitting}
                    aria-busy={newsletterSubmitting}
                    aria-label={tr(
                      "footer.newsletter.subscribe_aria",
                      "Subscribe to newsletter"
                    )}
                    className="shrink-0 h-11 min-w-11 rounded-lg bg-white px-3 text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </form>
                <p className="text-xs leading-5 text-slate-400">
                  {tr(
                    "footer.newsletter.consent",
                    "Confirm your email to receive Diaspora Unlocked news and opportunities. Unsubscribe at any time. This does not create a platform account."
                  )}{" "}
                  <Link
                    href="/privacy-policy"
                    className="underline hover:text-white"
                  >
                    {tr("footer.newsletter.privacy", "Privacy policy")}
                  </Link>
                </p>
                {newsletterFeedback ? (
                  <p
                    className={`text-xs ${
                      newsletterFeedback.kind === "success"
                        ? "text-emerald-300"
                        : "text-rose-300"
                    }`}
                    role="status"
                  >
                    {newsletterFeedback.message}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Contact Column */}
            <div className="col-span-2 sm:col-span-1 min-w-0 space-y-4">
              <h3 className="text-white text-[10px] font-black uppercase tracking-widest">
                {t("contact")}
              </h3>
              <ul className="text-slate-400 space-y-3 text-xs">
                <li>
                  <ContactEnquiry />
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="h-4 w-4 shrink-0 text-yellow-400" />
                  <a
                    href="mailto:info@diasporaunlocked.com"
                    className="min-w-0 break-all hover:text-white transition-colors"
                  >
                    info@diasporaunlocked.com
                  </a>
                </li>
                <li>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex min-h-11 items-center gap-3 text-left text-slate-400 hover:text-white transition-colors"
                      >
                        <Phone className="h-4 w-4 shrink-0 text-yellow-400" />
                        <span>+49 151 474 16152</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="top"
                      align="start"
                      className="z-[260] w-56 rounded-xl border-white/15 bg-slate-900 p-2 text-white shadow-2xl"
                    >
                      <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-slate-300">
                        {tr("footer.contact.options_title", "Contact Options")}
                      </DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <a
                          href="tel:+4915147416152"
                          className="min-h-11 gap-3 rounded-lg px-3 focus:bg-white/10 focus:text-white"
                        >
                          <Phone className="h-4 w-4" />
                          {tr("footer.contact.call", "Call")}
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a
                          href="https://wa.me/+4915147416152"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-11 gap-3 rounded-lg px-3 text-green-300 focus:bg-white/10 focus:text-green-200"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {tr("footer.contact.whatsapp", "WhatsApp")}
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
                <li className="flex items-start gap-3 opacity-90">
                  <MapPin className="h-4 w-4 shrink-0 text-yellow-400" />
                  <span>
                    {tr("footer.contact.location", "Heidelberg, Germany")}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <nav
            aria-label={t("pilot.operator_title")}
            className="mb-6 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/80 underline underline-offset-4"
          >
            <Link href="/legal-notice">{t("pilot.operator_title")}</Link>
            <Link href="/delivery-and-returns">
              {t("pilot.procedures_title")}
            </Link>
            <Link href="/cookie-settings">{t("cookies.consent.settings")}</Link>
          </nav>
          <div className="mb-6">
            <ThemeSwitcher />
          </div>
          {/* Bottom Bar: Maintain horizontal flex on desktop, vertical on mobile */}
          <div className="border-t border-white/10 pt-8 flex flex-col flex-wrap md:flex-row justify-between items-center gap-6 text-[10px]">
            <p className="text-slate-400 text-xs font-medium">
              © 2026 {t("brand")}. {t("all_rights_reserved")}
            </p>
            <div className="footer-bottom-links flex max-w-full flex-wrap justify-center gap-x-6 gap-y-3">
              <Link
                href="/admin"
                className="inline-flex min-h-11 items-center text-slate-400 hover:text-white transition-colors uppercase tracking-widest font-bold"
              >
                {tr("nav.admin", "Admin")}
              </Link>
              <Link
                href="/privacy-policy"
                className="text-slate-500 hover:text-white transition-colors uppercase tracking-widest font-bold"
              >
                {t("privacy_policy")}
              </Link>
              <Link
                href="/terms-of-service"
                className="text-slate-500 hover:text-white transition-colors uppercase tracking-widest font-bold"
              >
                {t("terms_of_service")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
