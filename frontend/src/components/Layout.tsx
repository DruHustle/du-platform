import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { checkOnesaHealth, sendOnesaChatMessage, type OnesaChatMessage } from "@/pages/OnesaAI";
import { Menu, X, Search, User, Globe, MessageCircle, Mail, Phone, MapPin, LogOut } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { api, clearAuthToken, getApiErrorMessage, refreshAuthTokenFromSession, type AuthUser } from "@/lib/api";
import { Send } from "lucide-react";


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
  horizontalReservedPx: 88,
};
const LANGUAGE_HINT_SEEN_KEY = "du_language_hint_v1";

function getBrowserLayoutProfile(userAgent: string): BrowserLayoutProfile {
  const ua = userAgent.toLowerCase();
  const isEdge = ua.includes("edg/");
  const isFirefox = ua.includes("firefox/");
  const isSafari = ua.includes("safari/") && !ua.includes("chrome/") && !isEdge;

  if (isEdge) {
    return { enterBuffer: 12, exitBuffer: 2, edgeRightPx: 8, horizontalReservedPx: 92 };
  }
  if (isFirefox) {
    return { enterBuffer: 11, exitBuffer: 3, edgeRightPx: 6, horizontalReservedPx: 92 };
  }
  if (isSafari) {
    return { enterBuffer: 12, exitBuffer: 3, edgeRightPx: 8, horizontalReservedPx: 92 };
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
  const { t, i18n } = useTranslation();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [phoneActionOpen, setPhoneActionOpen] = useState(false);
  const [showWhatsIcon, setShowWhatsIcon] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [desktopViewportWidth, setDesktopViewportWidth] = useState(1440);
  const [useEdgeIconColumn, setUseEdgeIconColumn] = useState(false);
  const [browserLayoutProfile, setBrowserLayoutProfile] = useState<BrowserLayoutProfile>(DEFAULT_BROWSER_LAYOUT_PROFILE);
  const [mobileBubblePosition, setMobileBubblePosition] = useState<{ x: number; y: number } | null>(null);
  const [showLanguageHint, setShowLanguageHint] = useState(false);
  const [isOnesaChatOpen, setIsOnesaChatOpen] = useState(false);
  const [onesaMessages, setOnesaMessages] = useState<OnesaChatMessage[]>([
    {
      role: "assistant",
      content:
        t("onesa.welcome", {
          defaultValue:
            "I am an expert on Zimbabwe. Let me help you navigate everything from investment, trade, and tourism to your day-to-day tasks.",
        }) || "I am an expert on Zimbabwe. Let me help you navigate everything from investment, trade, and tourism to your day-to-day tasks.",
    },
  ]);
  const [onesaInput, setOnesaInput] = useState("");
  const [onesaLoading, setOnesaLoading] = useState(false);
  const [onesaError, setOnesaError] = useState("");
  const [onesaStatus, setOnesaStatus] = useState("");
  const [onesaIsOnline, setOnesaIsOnline] = useState(false);
  const [onesaRetryAfterSecondsRemaining, setOnesaRetryAfterSecondsRemaining] = useState<number | null>(null);
  const scrolledRef = useRef(false);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const onesaMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const navPillRef = useRef<HTMLDivElement | null>(null);
  const utilitySlotRef = useRef<HTMLDivElement | null>(null);
  const suppressBubbleClickRef = useRef(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    dragging: boolean;
  } | null>(null);

  const markLanguageHintSeen = useCallback(() => {
    try {
      window.localStorage.setItem(LANGUAGE_HINT_SEEN_KEY, "seen");
    } catch {
      // Ignore storage failures.
    }
  }, []);

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

  useEffect(() => {
    if (isMobileViewport || mobileMenuOpen) return;
    try {
      const seen = window.localStorage.getItem(LANGUAGE_HINT_SEEN_KEY);
      if (seen) return;
    } catch {
      // Ignore storage read failures.
    }

    const showTimer = window.setTimeout(() => {
      setShowLanguageHint(true);
      markLanguageHintSeen();
    }, 900);
    const hideTimer = window.setTimeout(() => {
      setShowLanguageHint(false);
    }, 9000);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [isMobileViewport, mobileMenuOpen, markLanguageHintSeen]);

  useEffect(() => {
    // Footer contact icon alternates between call/WhatsApp affordances.
    const timer = setInterval(() => {
      setShowWhatsIcon((prev) => !prev);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  // Sync mobile menu close with route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    let mounted = true;
    const fetchMe = async () => {
      try {
        // Best-effort session bootstrap; UI remains usable when auth lookup fails.
        const { data } = await api.get("/auth/me");
        if (mounted) {
          setUser(data?.user ?? null);
          if (data?.user) {
            try {
              await refreshAuthTokenFromSession();
            } catch {
              // Ignore refresh failure; session-backed navigation still works.
            }
          }
        }
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
    } catch {
      // Intentionally ignore: UI should still clear local session state
    } finally {
      clearAuthToken();
      setUser(null);
      window.location.href = "/";
    }
  };

  const languages = [
    { name: "English", flag: "🇬🇧", code: "en" },
    { name: "chiShona", flag: "🇿🇼", code: "sn" },
    { name: "isiNdebele", flag: "🇿🇼", code: "nd" },
    { name: "Deutsch", flag: "🇩🇪", code: "de" }
  ];
  const navigation = [
    { name: t('nav.home'), href: "/" },
    { name: t('nav.technology'), href: "/technology" },
    { name: t("nav.payments", { defaultValue: "Payments" }), href: "/payments" },
    { name: t('nav.shop'), href: "/shop" },
    { name: t('nav.tourism'), href: "/tourism" },
    { name: t('nav.investment'), href: "/investment" },
    { name: t('nav.trade'), href: "/trade" },
    { name: t('nav.data'), href: "/data-visualization" },
    { name: t('nav.success'), href: "/success-stories" },
  ];

  const isActive = (href: string) => (href === "/" ? location === "/" : location.startsWith(href));
  // Hide the floating chat bubble on dedicated chat/tourism-experience routes to avoid duplicate UX.
  const hideOnesaBubbleRoutes = [
    "/onesa-ai-chat",
    "/onesa-ai-tourism-virtual-experince",
    "/onesa-ai-tourism-augmented-experince",
  ];
  // Bubble is visible on all other routes by default.
  const showOnesaBubble = !hideOnesaBubbleRoutes.some((route) => location.startsWith(route));
  const hasOnesaChatStarted = onesaMessages.some((message) => message.role === "user");
  const MOBILE_BUBBLE_STORAGE_KEY = "onesa-mobile-bubble-position-v1";

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
    const projectedIconsLeft = utilitySlotRect.right - browserLayoutProfile.horizontalReservedPx;
    setUseEdgeIconColumn((isCurrentlyEdgeColumn) => {
      if (isCurrentlyEdgeColumn) {
        // Return to original horizontal state as soon as overlap clears with a small hysteresis.
        const canReturnHorizontal = navRect.right < projectedIconsLeft - browserLayoutProfile.exitBuffer;
        return !canReturnHorizontal;
      }

      // Switch to vertical only when horizontal layout would overlap.
      const hasProjectedOverlap = navRect.right >= projectedIconsLeft - browserLayoutProfile.enterBuffer;
      return hasProjectedOverlap;
    });
  }, [browserLayoutProfile.enterBuffer, browserLayoutProfile.exitBuffer, browserLayoutProfile.horizontalReservedPx]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBrowserLayoutProfile(getBrowserLayoutProfile(window.navigator.userAgent));
  }, []);

  const clampMobileBubblePosition = (x: number, y: number, bubbleWidth: number, bubbleHeight: number) => {
    // Keep floating bubble fully visible inside the viewport.
    const minX = 8;
    const minY = 8;
    const maxX = Math.max(minX, window.innerWidth - bubbleWidth - 8);
    const maxY = Math.max(minY, window.innerHeight - bubbleHeight - 8);
    return { x: Math.min(Math.max(x, minX), maxX), y: Math.min(Math.max(y, minY), maxY) };
  };

  useEffect(() => {
    const onResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
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
  }, [i18n.language, i18n.resolvedLanguage, location, desktopViewportWidth, evaluateUtilityOverlap]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => evaluateUtilityOverlap());
    if (navPillRef.current) observer.observe(navPillRef.current);
    if (utilitySlotRef.current) observer.observe(utilitySlotRef.current);
    return () => observer.disconnect();
  }, [evaluateUtilityOverlap]);

  useEffect(() => {
    if (!showOnesaBubble || !isMobileViewport) return;

    const initPosition = () => {
      const bubbleRect = bubbleRef.current?.getBoundingClientRect();
      const bubbleWidth = bubbleRect?.width ?? 180;
      const bubbleHeight = bubbleRect?.height ?? 64;

      let nextX = window.innerWidth - bubbleWidth - 16;
      let nextY = window.innerHeight - bubbleHeight - 96;

      try {
        // Restore last dragged mobile position if available.
        const saved = window.localStorage.getItem(MOBILE_BUBBLE_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as { x?: unknown; y?: unknown };
          if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
            nextX = parsed.x;
            nextY = parsed.y;
          }
        }
      } catch {
        // Ignore malformed localStorage values.
      }

      setMobileBubblePosition(clampMobileBubblePosition(nextX, nextY, bubbleWidth, bubbleHeight));
    };

    const rafId = window.requestAnimationFrame(initPosition);
    return () => window.cancelAnimationFrame(rafId);
  }, [showOnesaBubble, isMobileViewport]);

  useEffect(() => {
    if (!showOnesaBubble || !isMobileViewport || !mobileBubblePosition) return;
    // Re-clamp after orientation/viewport shifts.
    const bubbleRect = bubbleRef.current?.getBoundingClientRect();
    const bubbleWidth = bubbleRect?.width ?? 180;
    const bubbleHeight = bubbleRect?.height ?? 64;
    const clamped = clampMobileBubblePosition(mobileBubblePosition.x, mobileBubblePosition.y, bubbleWidth, bubbleHeight);
    if (clamped.x !== mobileBubblePosition.x || clamped.y !== mobileBubblePosition.y) {
      setMobileBubblePosition(clamped);
    }
  }, [showOnesaBubble, isMobileViewport, mobileBubblePosition]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
    setSearchOpen(false);
    setSearchQuery("");
  };

  const checkOnesaPopupHealth = useCallback(async (): Promise<boolean> => {
    // Shared health check for the floating chat modal and status indicator.
    const backendUnreachableStatus =
      t("onesa.status_backend_unreachable", {
        defaultValue: "Onesa is currently unavailable. AI mode is off",
      }) || "Onesa is currently unavailable. AI mode is off";
    const health = await checkOnesaHealth(backendUnreachableStatus);
    setOnesaIsOnline(health.online);
    setOnesaStatus(health.statusText);
    return health.online;
  }, [t]);

  useEffect(() => {
    if (!isOnesaChatOpen) return;
    void checkOnesaPopupHealth();
  }, [isOnesaChatOpen, checkOnesaPopupHealth]);

  useEffect(() => {
    if (onesaRetryAfterSecondsRemaining === null) return;
    if (onesaRetryAfterSecondsRemaining <= 0) {
      setOnesaRetryAfterSecondsRemaining(null);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setOnesaRetryAfterSecondsRemaining((current) => {
        if (current === null) return null;
        return Math.max(0, current - 1);
      });
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [onesaRetryAfterSecondsRemaining]);

  useEffect(() => {
    if (!isOnesaChatOpen) return;
    const frameId = window.requestAnimationFrame(() => {
      onesaMessagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [isOnesaChatOpen, onesaMessages, onesaLoading]);

  const sendOnesaPopupMessage = async () => {
    const trimmed = onesaInput.trim();
    if (!trimmed || onesaLoading) return;
    void checkOnesaPopupHealth();

    const nextMessages: OnesaChatMessage[] = [...onesaMessages, { role: "user", content: trimmed }];
    setOnesaMessages(nextMessages);
    setOnesaInput("");
    setOnesaError("");
    setOnesaRetryAfterSecondsRemaining(null);
    setOnesaLoading(true);

    try {
      const { data } = await sendOnesaChatMessage({
        messages: nextMessages,
        language: i18n.resolvedLanguage ?? i18n.language ?? "en",
      });
      const reply = String(data?.reply ?? "").trim();
      if (!reply) throw new Error("Empty model response.");
      setOnesaMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setOnesaIsOnline(true);
      setOnesaStatus("");
    } catch (err: any) {
      const statusCode = Number(err?.response?.status ?? 0);
      const responseMessage = getApiErrorMessage(err, "");
      const retryAfterMs = Number(err?.response?.data?.retryAfterMs ?? 0);
      const retryAfterSeconds = retryAfterMs > 0 ? Math.max(1, Math.ceil(retryAfterMs / 1000)) : null;
      const isRateLimited =
        statusCode === 429 ||
        /status code 429|rate limit|too many requests/i.test(String(err?.message ?? responseMessage ?? ""));
      const rateLimitedError =
        t("onesa.error_rate_limited", {
          defaultValue: "Onesa is busy right now. Please try again in a few seconds.",
        }) || "Onesa is busy right now. Please try again in a few seconds.";
      const genericContactError =
        t("onesa.error_unable_contact", {
          defaultValue: "Onesa is currently unavailable. AI mode is off",
        }) || "Onesa is currently unavailable. AI mode is off";
      const timeoutMessage =
        err?.code === "ECONNABORTED"
          ? t("onesa.error_timeout", { defaultValue: "Onesa request timed out after 3 minutes. Please try again." })
          : null;
      const safeResponseMessage =
        typeof responseMessage === "string" && !/status code \d+/i.test(responseMessage) ? responseMessage : null;
      const message = isRateLimited ? rateLimitedError : timeoutMessage ?? safeResponseMessage ?? genericContactError;
      setOnesaRetryAfterSecondsRemaining(isRateLimited ? retryAfterSeconds : null);
      setOnesaError(message);
      if (!isRateLimited) {
        void checkOnesaPopupHealth();
      }
    } finally {
      setOnesaLoading(false);
    }
  };

  const handleOnesaPopupSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendOnesaPopupMessage();
  };

  const handleOnesaPopupInputKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await sendOnesaPopupMessage();
    }
  };

  const handleBubblePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobileViewport || !mobileBubblePosition) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: mobileBubblePosition.x,
      originY: mobileBubblePosition.y,
      dragging: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleBubblePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!isMobileViewport || !dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (!dragState.dragging && Math.hypot(deltaX, deltaY) > 4) {
      dragState.dragging = true;
    }
    if (!dragState.dragging) return;

    // Prevent page scrolling while dragging the bubble.
    event.preventDefault();
    const bubbleRect = bubbleRef.current?.getBoundingClientRect();
    const bubbleWidth = bubbleRect?.width ?? 180;
    const bubbleHeight = bubbleRect?.height ?? 64;
    const next = clampMobileBubblePosition(dragState.originX + deltaX, dragState.originY + deltaY, bubbleWidth, bubbleHeight);
    setMobileBubblePosition(next);
  };

  const handleBubblePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (dragState.dragging) {
      // Suppress the click that follows a drag so users do not navigate accidentally.
      suppressBubbleClickRef.current = true;
      window.setTimeout(() => {
        suppressBubbleClickRef.current = false;
      }, 250);
      if (mobileBubblePosition) {
        try {
          // Persist mobile bubble placement between sessions.
          window.localStorage.setItem(MOBILE_BUBBLE_STORAGE_KEY, JSON.stringify(mobileBubblePosition));
        } catch {
          // Ignore storage write failures.
        }
      }
    }
    dragStateRef.current = null;
  };

  const handleBubbleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!suppressBubbleClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressBubbleClickRef.current = false;
  };

  const handleBubbleOpenChat = (event: React.MouseEvent<HTMLButtonElement>) => {
    handleBubbleClick(event);
    if (event.defaultPrevented) return;
    setIsOnesaChatOpen(true);
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
                  src='/images/pages/shared/made_in_zimbabwe.png'
                  alt='Logo'
                  className="h-9 w-9 object-contain"
                />
              </div>
            </Link>
          </div>

          {/* 2. Middle Section: Desktop Navigation (Absolute Center) */}
          <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center">
            <div
              ref={navPillRef}
              className={`
              relative flex items-center gap-1 p-1 px-6 rounded-full transition-all duration-700 overflow-hidden
              ${scrolled 
                ? 'bg-slate-900/90 backdrop-blur-md border border-white/10' 
                : 'bg-white/[0.08] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)]' 
              }
            `}
            >
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
          <div
            ref={utilitySlotRef}
            className="relative z-[230] flex items-center justify-end flex-1 lg:flex-none lg:min-w-[200px] pointer-events-none"
          >
            <div
              className={`${getDesktopUtilityIconsClass(useEdgeIconColumn)} pointer-events-auto`}
              style={useEdgeIconColumn ? { right: `${browserLayoutProfile.edgeRightPx}px` } : undefined}
            >
            <AnimatePresence>
              {showLanguageHint && !mobileMenuOpen && !isMobileViewport && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="hidden md:block absolute top-10 right-10 z-[260]"
                >
                  <div className="relative max-w-[220px] rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.35)] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLanguageHint(false);
                        markLanguageHintSeen();
                      }}
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full border border-white/30 bg-slate-900/80 text-white/80 text-[10px] leading-none hover:bg-white hover:text-zim-black"
                      aria-label={t("nav.language_hint_dismiss", { defaultValue: "Dismiss language hint" })}
                    >
                      ×
                    </button>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zim-gold">
                      {t("nav.language_hint_title", { defaultValue: "Language options" })}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/90">
                      {t("nav.language_hint", { defaultValue: "Use the globe icon to change language." })}
                    </p>
                    <span className="absolute -bottom-1 right-6 h-2.5 w-2.5 rotate-45 border-r border-b border-white/20 bg-white/10" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Tool */}
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden sm:flex text-white/60 hover:text-yellow-400 rounded-full transition-colors h-8 w-8">
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
            <DropdownMenu
              onOpenChange={(open) => {
                if (open) {
                  setShowLanguageHint(false);
                  markLanguageHintSeen();
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                {/* Hidden on mobile while menu is open to avoid duplicate controls. */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  aria-label={t("nav.language_hint", { defaultValue: "Use the globe icon to change language." })}
                  className={`
                    ${mobileMenuOpen ? 'hidden' : 'hidden md:flex'} 
                    text-white/60 hover:text-yellow-400 rounded-full h-8 w-8
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
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-yellow-400 rounded-full h-8 w-8 transition-colors">
                  <User className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent 
                align="end" 
                className="bg-slate-900/95 backdrop-blur-3xl border-white/10 text-white rounded-2xl p-2 shadow-2xl min-w-[12rem] z-[100]"
              >
                <DropdownMenuLabel className="text-white/40 font-black text-[10px] uppercase tracking-widest px-3 py-2">
                  {user ? user.fullName : t('account')}
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator className="bg-white/10" />

                {authLoading ? (
                  <DropdownMenuItem className="rounded-xl py-2.5 px-3 cursor-default">
                    <div aria-hidden="true" className="h-4 w-24 rounded bg-white/15 animate-pulse" />
                  </DropdownMenuItem>
                ) : user ? (
                  <>
                    <Link href="/admin">
                      <DropdownMenuItem className="cursor-pointer rounded-xl hover:bg-white/10 py-2.5 px-3 text-sm transition-colors duration-200 outline-none">
                        <div className="flex items-center gap-2 w-full">Admin</div>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-xl hover:bg-white/10 py-2.5 px-3 text-sm transition-colors duration-200 outline-none">
                      <div className="flex items-center gap-2 w-full">
                        <LogOut className="h-4 w-4" />
                        Logout
                      </div>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <DropdownMenuItem className="cursor-pointer rounded-xl hover:bg-white/10 py-2.5 px-3 text-sm transition-colors duration-200 outline-none">
                        <div className="flex items-center gap-2 w-full">
                          {t('login')}
                        </div>
                      </DropdownMenuItem>
                    </Link>

                    <Link href="/register">
                      <DropdownMenuItem className="cursor-pointer rounded-xl hover:bg-zim-gold hover:text-zim-black py-2.5 px-3 text-sm font-bold transition-all duration-300 outline-none">
                        <div className="flex items-center gap-2 w-full">
                          {t('register')}
                        </div>
                      </DropdownMenuItem>
                    </Link>
                  </>
                )}
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
        </div>
      </header>

      {/* --- MOBILE FLASH PANEL (Aligned with Menu Bar) --- */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop intercepts outside taps and closes the slideout menu. */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[190] lg:hidden" 
              onClick={() => setMobileMenuOpen(false)} 
            />

            {/* Menu stays visually below header actions using explicit z-index layering. */}
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

      {showOnesaBubble && (
        /* Onesa Floating Bubble */
        <motion.div
          ref={bubbleRef}
          initial={{ opacity: 0, y: 12 }}
          animate={
            isMobileViewport
              ? {
                  opacity: 1,
                  y: 0,
                  boxShadow: [
                    "0 0 0 rgba(212,175,55,0)",
                    "0 0 18px rgba(212,175,55,0.28)",
                    "0 0 0 rgba(212,175,55,0)",
                  ],
                }
              : { opacity: 1, y: 0 }
          }
          transition={
            isMobileViewport
              ? {
                  opacity: { duration: 0.35 },
                  y: { duration: 0.35 },
                  boxShadow: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
                }
              : { duration: 0.35 }
          }
          className={isMobileViewport ? "fixed z-[95] rounded-full" : "fixed bottom-24 right-5 md:bottom-10 md:right-10 z-[95]"}
          style={
            isMobileViewport && mobileBubblePosition
              ? {
                  left: `${mobileBubblePosition.x}px`,
                  top: `${mobileBubblePosition.y}px`,
                  touchAction: "none",
                }
              : undefined
          }
          onPointerDown={handleBubblePointerDown}
          onPointerMove={handleBubblePointerMove}
          onPointerUp={handleBubblePointerEnd}
          onPointerCancel={handleBubblePointerEnd}
        >
          <button
            type="button"
            onClick={handleBubbleOpenChat}
            aria-label={t("tech.chat_with_onesa") || "Chat with Onesa"}
            className="group relative flex items-center gap-3 rounded-full border border-zim-gold/35 bg-slate-950/90 backdrop-blur-md pl-2 pr-4 py-2 shadow-2xl hover:bg-slate-900 transition-colors will-change-transform"
          >
            <span className="relative h-12 w-12 rounded-full overflow-hidden border border-zim-gold/40">
              <img
                src="/images/pages/technology/zim_think.jpg"
                alt="Onesa AI assistant"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent" />
            </span>
            <span className="text-left">
              <span className="block text-zim-gold text-[10px] font-black uppercase tracking-widest">Onesa</span>
              <span className="block text-white text-xs font-semibold">{t("tech.chat_with_onesa") || "Chat with Onesa"}</span>
            </span>
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {isOnesaChatOpen && (
          <>
            <motion.button
              type="button"
              aria-label={t("close") || "Close"}
              onClick={() => setIsOnesaChatOpen(false)}
              className="fixed inset-0 z-[240] bg-slate-950/55 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.section
              initial={isMobileViewport ? { opacity: 0, y: 40 } : { opacity: 0, y: 24, scale: 0.98 }}
              animate={isMobileViewport ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 }}
              exit={isMobileViewport ? { opacity: 0, y: 40 } : { opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`fixed z-[250] overflow-hidden border border-zim-gold/20 bg-slate-950/95 shadow-[0_28px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl ${
                isMobileViewport
                  ? "left-3 right-3 top-[6.5rem] bottom-4 rounded-[1.4rem]"
                  : "bottom-24 right-5 md:right-10 h-[min(72vh,640px)] w-[min(440px,calc(100vw-2rem))] rounded-[1.8rem]"
              }`}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-zim-gold text-[10px] font-black uppercase tracking-[0.22em]">Onesa</p>
                    <h2 className="truncate !text-sm font-black text-white">
                      {t("onesa.title", { defaultValue: "Chat with Onesa AI" })}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                        onesaIsOnline
                          ? "border border-emerald-300/40 bg-emerald-500/15 text-emerald-300"
                          : "border border-red-300/40 bg-red-500/15 text-red-300"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          onesaIsOnline ? "bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.9)]" : "bg-red-400"
                        }`}
                      />
                      {onesaIsOnline
                        ? t("onesa.online_text", { defaultValue: "Online" })
                        : t("onesa.offline_text", { defaultValue: "Offline" })}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOnesaChatOpen(false)}
                      className="h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {onesaStatus ? (
                  <p className="border-b border-white/10 px-4 py-2 text-[11px] leading-relaxed text-white/70">{onesaStatus}</p>
                ) : null}

                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <div className="space-y-4">
                    {onesaMessages.map((message, index) => (
                      <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[92%] px-3 py-2 text-sm leading-relaxed ${
                            message.role === "user"
                              ? "rounded-[1.25rem] rounded-br-[0.45rem] bg-slate-900/90 border border-zim-gold/30 text-white"
                              : "rounded-[1.25rem] rounded-bl-[0.45rem] bg-zim-gold/10 border border-zim-gold/45 text-white shadow-[0_0_24px_rgba(212,175,55,0.22)]"
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}
                    <div ref={onesaMessagesEndRef} />
                  </div>
                </div>

                <form onSubmit={handleOnesaPopupSubmit} className="border-t border-white/10 px-4 py-3 space-y-2">
                  <Textarea
                    value={onesaInput}
                    onChange={(e) => setOnesaInput(e.target.value)}
                    onKeyDown={handleOnesaPopupInputKeyDown}
                    placeholder={
                      hasOnesaChatStarted
                        ? ""
                        : t("onesa.starter_prompt", {
                            defaultValue: "Start chat....",
                          })
                    }
                    className="min-h-[96px] bg-white/[0.02] border-white/20 text-white placeholder:text-white/30"
                  />
                  {onesaError ? (
                    <p className="text-red-400 text-xs">
                      {onesaError}
                      {onesaRetryAfterSecondsRemaining !== null ? ` (${onesaRetryAfterSecondsRemaining}s)` : ""}
                    </p>
                  ) : null}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={onesaLoading}
                      className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[11px] rounded-full px-6"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {onesaLoading
                        ? t("onesa.thinking", { defaultValue: "Thinking..." })
                        : t("onesa.send", { defaultValue: "Send" })}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>

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
                <li><a href="https://zimparks.org.zw/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">ZimParks</a></li>
                <li><a href="https://zidainvest.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">ZIDA Invest</a></li>
                <li><a href="https://tradezimbabwe.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">ZimTrade</a></li>
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
                <li className="relative">
                  <button
                    onClick={() => setPhoneActionOpen((prev) => !prev)}
                    className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors"
                  >
                    <span className="relative h-4 w-4">
                      <AnimatePresence mode="wait" initial={false}>
                        {showWhatsIcon ? (
                          <motion.span
                            key="wa"
                            initial={{ opacity: 0, scale: 0.7, rotate: -20 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.7, rotate: 20 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 text-green-400"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="call"
                            initial={{ opacity: 0, scale: 0.7, rotate: 20 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.7, rotate: -20 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 text-yellow-400"
                          >
                            <Phone className="h-4 w-4" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                    <span>+49 151 474 16152</span>
                  </button>
                  <AnimatePresence>
                    {phoneActionOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        className="absolute left-0 mt-2 w-56 rounded-xl border border-white/15 bg-slate-900/95 backdrop-blur-xl p-3 shadow-2xl z-[120]"
                      >
                        <p className="text-[10px] uppercase tracking-widest text-white/50 font-black mb-2">
                          Contact Options
                        </p>
                        <div className="flex flex-col gap-2">
                          <a
                            href="tel:+4915147416152"
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-white hover:bg-white hover:text-slate-900 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            Call
                          </a>
                          <a
                            href="https://wa.me/+4915147416152"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-green-400/30 bg-green-500/15 px-3 py-2 text-xs text-green-300 hover:bg-green-500 hover:text-white transition-colors"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
              <Link href="/privacy-policy" className="text-slate-500 hover:text-white transition-colors uppercase tracking-widest font-bold">
                {t('privacy_policy')}
              </Link>
              <Link href="/terms-of-service" className="text-slate-500 hover:text-white transition-colors uppercase tracking-widest font-bold">
                {t('terms_of_service')}
              </Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
