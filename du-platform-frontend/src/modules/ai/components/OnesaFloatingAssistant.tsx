import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FormattedChatMessage from "@/components/FormattedChatMessage";
import {
  checkOnesaHealth,
  sendOnesaChatMessage,
  type OnesaChatMessage,
} from "@/modules/ai/lib/aiApi";

const MOBILE_BUBBLE_STORAGE_KEY = "onesa-mobile-bubble-position-v3";
const DESKTOP_BUBBLE_STORAGE_KEY = "onesa-desktop-bubble-position-v2";
const HIDE_ONESA_BUBBLE_ROUTES = [
  "/onesa-ai-chat",
  "/onesa-ai-tourism-virtual-experience",
  "/onesa-ai-tourism-augmented-experience",
  "/onesa-ai-tourism-virtual-experince",
  "/onesa-ai-tourism-augmented-experince",
];

type DragState = {
  pointerId: number;
  pointerType: string;
  dragEnabled: boolean;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  dragging: boolean;
};

function getWelcomeMessage(t: ReturnType<typeof useTranslation>["t"]) {
  return (
    t("onesa.welcome", {
      defaultValue:
        "I am an expert on Zimbabwe and the African continent. Let me help you navigate everything from investment, technology, and tourism to your day-to-day tasks.",
    }) ||
    "I am an expert on Zimbabwe and the African continent. Let me help you navigate everything from investment, technology, and tourism to your day-to-day tasks."
  );
}

export default function OnesaFloatingAssistant() {
  const { t, i18n } = useTranslation();
  const [location] = useLocation();
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });
  const [desktopViewportWidth, setDesktopViewportWidth] = useState(() => {
    if (typeof window === "undefined") return 1440;
    return window.innerWidth;
  });
  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window === "undefined") return 900;
    return window.innerHeight;
  });
  const [bubbleDimensions, setBubbleDimensions] = useState({
    width: 180,
    height: 64,
  });
  const [bubblePosition, setBubblePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isOnesaChatOpen, setIsOnesaChatOpen] = useState(false);
  const [onesaMessages, setOnesaMessages] = useState<OnesaChatMessage[]>([
    {
      role: "assistant",
      content: getWelcomeMessage(t),
    },
  ]);
  const [onesaInput, setOnesaInput] = useState("");
  const [onesaLoading, setOnesaLoading] = useState(false);
  const [onesaError, setOnesaError] = useState("");
  const [onesaStatus, setOnesaStatus] = useState("");
  const [onesaIsOnline, setOnesaIsOnline] = useState(false);
  const [onesaRetryAfterSecondsRemaining, setOnesaRetryAfterSecondsRemaining] =
    useState<number | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const bubblePositionRef = useRef<{ x: number; y: number } | null>(null);
  const onesaMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const requestInFlightRef = useRef(false);
  const healthCheckVersionRef = useRef(0);
  const suppressBubbleClickRef = useRef(false);
  const dragStateRef = useRef<DragState | null>(null);
  const touchDragArmTimeoutRef = useRef<number | null>(null);
  const loadedBubblePositionFromStorageRef = useRef(false);
  const alignedDesktopDefaultPositionRef = useRef(false);

  const showOnesaBubble = !HIDE_ONESA_BUBBLE_ROUTES.some(route =>
    location.startsWith(route)
  );
  const hasOnesaChatStarted = onesaMessages.some(
    message => message.role === "user"
  );

  const clampBubblePosition = useCallback(
    (x: number, y: number, bubbleWidth: number, bubbleHeight: number) => {
      const minX = -bubbleWidth;
      const minY = -bubbleHeight;
      const maxX = window.innerWidth;
      const maxY = window.innerHeight;
      return {
        x: Math.min(Math.max(x, minX), maxX),
        y: Math.min(Math.max(y, minY), maxY),
      };
    },
    []
  );

  const getBubbleStorageKey = useCallback(
    () =>
      isMobileViewport ? MOBILE_BUBBLE_STORAGE_KEY : DESKTOP_BUBBLE_STORAGE_KEY,
    [isMobileViewport]
  );

  const persistBubblePosition = useCallback(
    (position: { x: number; y: number } | null) => {
      if (!position) return;
      try {
        window.localStorage.setItem(
          getBubbleStorageKey(),
          JSON.stringify(position)
        );
      } catch {
        // Ignore storage write failures.
      }
    },
    [getBubbleStorageKey]
  );

  const updateBubblePosition = useCallback(
    (position: { x: number; y: number }) => {
      bubblePositionRef.current = position;
      setBubblePosition(position);
    },
    []
  );

  useEffect(() => {
    const welcomeMessage = getWelcomeMessage(t);
    setOnesaMessages(current => {
      if (current.some(message => message.role === "user")) return current;
      return [{ role: "assistant", content: welcomeMessage }];
    });
  }, [t, i18n.resolvedLanguage, i18n.language]);

  useEffect(() => {
    const onResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
      setDesktopViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!showOnesaBubble) {
      setIsOnesaChatOpen(false);
    }
  }, [showOnesaBubble]);

  useLayoutEffect(() => {
    if (!showOnesaBubble) return;

    const initPosition = () => {
      const bubbleRect = bubbleRef.current?.getBoundingClientRect();
      const bubbleWidth = bubbleRect?.width ?? 180;
      const bubbleHeight = bubbleRect?.height ?? 64;

      let nextX = isMobileViewport
        ? window.innerWidth - bubbleWidth - 16
        : window.innerWidth - bubbleWidth - 40;
      let nextY = isMobileViewport
        ? window.innerHeight - bubbleHeight - 96
        : window.innerHeight - bubbleHeight - 40;
      let loadedFromStorage = false;

      try {
        const saved = window.localStorage.getItem(getBubbleStorageKey());
        if (saved) {
          const parsed = JSON.parse(saved) as { x?: unknown; y?: unknown };
          if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
            nextX = parsed.x;
            nextY = parsed.y;
            loadedFromStorage = true;
          }
        }
      } catch {
        // Ignore malformed local storage values.
      }

      loadedBubblePositionFromStorageRef.current = loadedFromStorage;
      alignedDesktopDefaultPositionRef.current =
        loadedFromStorage || isMobileViewport;

      const initialPosition = clampBubblePosition(
        nextX,
        nextY,
        bubbleWidth,
        bubbleHeight
      );
      updateBubblePosition(initialPosition);
      if (!loadedFromStorage) {
        persistBubblePosition(initialPosition);
      }
    };

    initPosition();
  }, [
    clampBubblePosition,
    getBubbleStorageKey,
    persistBubblePosition,
    showOnesaBubble,
    isMobileViewport,
    updateBubblePosition,
  ]);

  useEffect(() => {
    if (!showOnesaBubble || !bubblePosition) return;
    const bubbleRect = bubbleRef.current?.getBoundingClientRect();
    const bubbleWidth = bubbleRect?.width ?? 180;
    const bubbleHeight = bubbleRect?.height ?? 64;
    const clamped = clampBubblePosition(
      bubblePosition.x,
      bubblePosition.y,
      bubbleWidth,
      bubbleHeight
    );
    if (clamped.x !== bubblePosition.x || clamped.y !== bubblePosition.y) {
      updateBubblePosition(clamped);
      persistBubblePosition(clamped);
    }
  }, [
    clampBubblePosition,
    persistBubblePosition,
    showOnesaBubble,
    isMobileViewport,
    bubblePosition,
    updateBubblePosition,
  ]);

  useEffect(() => {
    if (!showOnesaBubble || !bubblePosition) return;
    persistBubblePosition(bubblePosition);
  }, [bubblePosition, persistBubblePosition, showOnesaBubble]);

  useLayoutEffect(() => {
    if (!showOnesaBubble) return;
    const bubbleNode = bubbleRef.current;
    if (!bubbleNode) return;

    const updateDimensions = () => {
      const bubbleRect = bubbleNode.getBoundingClientRect();
      setBubbleDimensions({
        width: bubbleRect.width || 180,
        height: bubbleRect.height || 64,
      });
    };

    updateDimensions();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(bubbleNode);
    return () => observer.disconnect();
  }, [showOnesaBubble]);

  useLayoutEffect(() => {
    if (!showOnesaBubble || isMobileViewport || !bubblePosition) return;
    if (
      loadedBubblePositionFromStorageRef.current ||
      alignedDesktopDefaultPositionRef.current
    )
      return;

    const measuredBubbleRect = bubbleRef.current?.getBoundingClientRect();
    const bubbleWidth = measuredBubbleRect?.width ?? bubbleDimensions.width;
    const bubbleHeight = measuredBubbleRect?.height ?? bubbleDimensions.height;

    const desiredPosition = clampBubblePosition(
      window.innerWidth - bubbleWidth - 40,
      window.innerHeight - bubbleHeight - 40,
      bubbleWidth,
      bubbleHeight
    );

    alignedDesktopDefaultPositionRef.current = true;
    updateBubblePosition(desiredPosition);
    persistBubblePosition(desiredPosition);
  }, [
    bubbleDimensions.height,
    bubbleDimensions.width,
    bubblePosition,
    clampBubblePosition,
    isMobileViewport,
    persistBubblePosition,
    showOnesaBubble,
    updateBubblePosition,
  ]);

  const checkOnesaPopupHealth = useCallback(async (): Promise<boolean> => {
    const version = ++healthCheckVersionRef.current;
    const backendUnreachableStatus =
      t("onesa.status_backend_unreachable", {
        defaultValue: "Onesa is currently unavailable. AI mode is off",
      }) || "Onesa is currently unavailable. AI mode is off";
    const health = await checkOnesaHealth(backendUnreachableStatus);
    if (version === healthCheckVersionRef.current) {
      setOnesaIsOnline(health.online);
      setOnesaStatus(health.statusText);
    }
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
      setOnesaRetryAfterSecondsRemaining(current => {
        if (current === null) return null;
        return Math.max(0, current - 1);
      });
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [onesaRetryAfterSecondsRemaining]);

  useEffect(() => {
    if (!isOnesaChatOpen) return;
    const frameId = window.requestAnimationFrame(() => {
      onesaMessagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [isOnesaChatOpen, onesaMessages, onesaLoading]);

  const sendOnesaPopupMessage = async () => {
    const trimmed = onesaInput.trim();
    if (
      !trimmed ||
      requestInFlightRef.current ||
      (onesaRetryAfterSecondsRemaining ?? 0) > 0
    )
      return;
    requestInFlightRef.current = true;

    const nextMessages: OnesaChatMessage[] = [
      ...onesaMessages,
      { role: "user", content: trimmed },
    ];
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
      setOnesaMessages(prev => [
        ...prev,
        { role: "assistant", content: reply, truncated: data.truncated },
      ]);
      healthCheckVersionRef.current += 1;
      setOnesaIsOnline(true);
      setOnesaStatus("");
    } catch (err: any) {
      const statusCode = Number(err?.response?.status ?? 0);
      const retryAfterMs = Number(err?.response?.data?.retryAfterMs ?? 0);
      const retryAfterSeconds =
        retryAfterMs > 0 ? Math.max(1, Math.ceil(retryAfterMs / 1000)) : null;
      const isRateLimited =
        statusCode === 429 ||
        /status code 429|rate limit|too many requests/i.test(
          String(err?.message ?? "")
        );
      const rateLimitedError =
        t("onesa.error_rate_limited", {
          defaultValue:
            "Onesa is busy right now. Please try again in a few seconds.",
        }) || "Onesa is busy right now. Please try again in a few seconds.";
      const genericContactError =
        t("onesa.error_unable_contact", {
          defaultValue: "Onesa is currently unavailable. AI mode is off",
        }) || "Onesa is currently unavailable. AI mode is off";
      const timeoutMessage =
        err?.code === "ECONNABORTED"
          ? t("onesa.error_timeout", {
              defaultValue: "Onesa request timed out. Please try again.",
            })
          : null;
      const message = isRateLimited
        ? rateLimitedError
        : (timeoutMessage ?? genericContactError);
      setOnesaRetryAfterSecondsRemaining(
        isRateLimited ? retryAfterSeconds : null
      );
      setOnesaError(message);
      setOnesaMessages(nextMessages.slice(0, -1));
      setOnesaInput(current => current || trimmed);
      if (!isRateLimited) {
        void checkOnesaPopupHealth();
      }
    } finally {
      requestInFlightRef.current = false;
      setOnesaLoading(false);
    }
  };

  const handleOnesaPopupSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendOnesaPopupMessage();
  };

  const handleOnesaPopupInputKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      await sendOnesaPopupMessage();
    }
  };

  const handleBubblePointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!bubblePosition) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    if (touchDragArmTimeoutRef.current !== null) {
      window.clearTimeout(touchDragArmTimeoutRef.current);
      touchDragArmTimeoutRef.current = null;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      dragEnabled: event.pointerType !== "touch",
      startX: event.clientX,
      startY: event.clientY,
      originX: bubblePosition.x,
      originY: bubblePosition.y,
      dragging: false,
    };

    if (event.pointerType === "touch") {
      const activePointerId = event.pointerId;
      touchDragArmTimeoutRef.current = window.setTimeout(() => {
        const state = dragStateRef.current;
        if (state && state.pointerId === activePointerId) {
          state.dragEnabled = true;
        }
        touchDragArmTimeoutRef.current = null;
      }, 180);
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleBubblePointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const dragState = dragStateRef.current;
    if (
      !dragState ||
      dragState.pointerId !== event.pointerId ||
      !dragState.dragEnabled
    )
      return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const dragThreshold = event.pointerType === "touch" ? 14 : 6;
    if (!dragState.dragging && Math.hypot(deltaX, deltaY) > dragThreshold) {
      dragState.dragging = true;
    }
    if (!dragState.dragging) return;

    event.preventDefault();
    const bubbleRect = bubbleRef.current?.getBoundingClientRect();
    const bubbleWidth = bubbleRect?.width ?? 180;
    const bubbleHeight = bubbleRect?.height ?? 64;
    const next = clampBubblePosition(
      dragState.originX + deltaX,
      dragState.originY + deltaY,
      bubbleWidth,
      bubbleHeight
    );
    updateBubblePosition(next);
  };

  const handleBubblePointerEnd = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (touchDragArmTimeoutRef.current !== null) {
      window.clearTimeout(touchDragArmTimeoutRef.current);
      touchDragArmTimeoutRef.current = null;
    }

    const wasDragging = dragState.dragging;
    const totalDelta = Math.hypot(
      event.clientX - dragState.startX,
      event.clientY - dragState.startY
    );
    const activationThreshold = dragState.pointerType === "touch" ? 28 : 10;
    const treatAsTap = totalDelta <= activationThreshold;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (wasDragging && !treatAsTap) {
      suppressBubbleClickRef.current = true;
      window.setTimeout(() => {
        suppressBubbleClickRef.current = false;
      }, 250);

      persistBubblePosition(bubblePositionRef.current);
    }

    dragStateRef.current = null;

    if (!wasDragging || treatAsTap) {
      setIsOnesaChatOpen(true);
    }
  };

  useEffect(() => {
    return () => {
      if (touchDragArmTimeoutRef.current !== null) {
        window.clearTimeout(touchDragArmTimeoutRef.current);
      }
    };
  }, []);

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

  const restoreBubbleIntoView = () => {
    const bubbleWidth = bubbleDimensions.width || 180;
    const bubbleHeight = bubbleDimensions.height || 64;
    const restored = clampBubblePosition(
      window.innerWidth - bubbleWidth - (isMobileViewport ? 0 : 40),
      window.innerHeight - bubbleHeight - (isMobileViewport ? 96 : 40),
      bubbleWidth,
      bubbleHeight
    );
    updateBubblePosition(restored);
    persistBubblePosition(restored);
  };

  let bubbleOffscreenSide: "left" | "right" | "top" | "bottom" | null = null;
  if (showOnesaBubble && bubblePosition) {
    const leftOverflow = Math.max(0, -bubblePosition.x);
    const rightOverflow = Math.max(
      0,
      bubblePosition.x + bubbleDimensions.width - desktopViewportWidth
    );
    const topOverflow = Math.max(0, -bubblePosition.y);
    const bottomOverflow = Math.max(
      0,
      bubblePosition.y + bubbleDimensions.height - viewportHeight
    );

    const dominantOverflow = [
      { side: "left" as const, value: leftOverflow },
      { side: "right" as const, value: rightOverflow },
      { side: "top" as const, value: topOverflow },
      { side: "bottom" as const, value: bottomOverflow },
    ].reduce((best, current) => (current.value > best.value ? current : best));

    if (dominantOverflow.value > 0) {
      bubbleOffscreenSide = dominantOverflow.side;
    }
  }

  if (!showOnesaBubble && !isOnesaChatOpen) {
    return null;
  }

  const bubbleStateReady = bubblePosition !== null;
  const showRestoreTrigger =
    showOnesaBubble &&
    bubbleStateReady &&
    bubbleOffscreenSide &&
    !isOnesaChatOpen;
  const showBubbleTrigger =
    showOnesaBubble && bubbleStateReady && !bubbleOffscreenSide;

  return (
    <>
      {showRestoreTrigger ? (
        <button
          type="button"
          data-onesa-bubble-restore="true"
          onClick={restoreBubbleIntoView}
          aria-label={t("tech.restore_chat_bubble", {
            defaultValue: "Show chat bubble",
          })}
          className={`fixed z-[96] border border-zim-gold/50 bg-slate-950/95 text-zim-gold backdrop-blur-md shadow-xl transition hover:bg-slate-900 ${
            bubbleOffscreenSide === "left"
              ? "left-0 top-1/2 -translate-y-1/2 rounded-r-full px-2 py-4"
              : bubbleOffscreenSide === "right"
                ? "right-0 top-1/2 -translate-y-1/2 rounded-l-full px-2 py-4"
                : bubbleOffscreenSide === "top"
                  ? "top-0 left-1/2 -translate-x-1/2 rounded-b-full px-4 py-2"
                  : "bottom-0 left-1/2 -translate-x-1/2 rounded-t-full px-4 py-2"
          }`}
        >
          {bubbleOffscreenSide === "left" ? (
            <ChevronRight className="h-4 w-4" />
          ) : bubbleOffscreenSide === "right" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : bubbleOffscreenSide === "top" ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>
      ) : null}

      {showBubbleTrigger ? (
        <motion.div
          ref={bubbleRef}
          data-onesa-bubble-container="true"
          initial={false}
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
                  boxShadow: {
                    duration: 2.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }
              : { duration: 0.35 }
          }
          className={`fixed z-[95] rounded-full ${bubblePosition ? "" : isMobileViewport ? "bottom-20 right-0" : "bottom-24 right-5 md:bottom-10 md:right-10"}`}
          style={
            bubblePosition
              ? {
                  left: `${bubblePosition.x}px`,
                  top: `${bubblePosition.y}px`,
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
            data-onesa-bubble-trigger="true"
            onClick={handleBubbleOpenChat}
            aria-label={t("tech.chat_with_onesa") || "Chat with Onesa"}
            className="group relative flex h-12 min-w-[160px] items-center gap-2 rounded-full border border-zim-gold/35 bg-slate-950/90 backdrop-blur-md pl-2 pr-4 shadow-2xl transition-colors hover:bg-slate-900 will-change-transform"
          >
            <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-zim-gold/40">
              <img
                src="/images/pages/technology/zim_think.jpg"
                alt={t("onesa.assistant_alt", {
                  defaultValue: "Onesa AI assistant",
                })}
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent" />
            </span>
            <span className="text-left leading-tight">
              <span className="block text-[9px] font-black uppercase tracking-widest text-zim-gold">
                {t("onesa.brand", { defaultValue: "Onesa" })}
              </span>
              <span className="block text-[11px] font-semibold text-white">
                {t("tech.chat_with_onesa") || "Chat with Onesa"}
              </span>
            </span>
          </button>
        </motion.div>
      ) : null}

      <Dialog.Root open={isOnesaChatOpen} onOpenChange={setIsOnesaChatOpen}>
        <AnimatePresence>
          {isOnesaChatOpen ? (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.button
                  type="button"
                  aria-label={t("close") || "Close"}
                  onClick={() => setIsOnesaChatOpen(false)}
                  className="fixed inset-0 z-[240] bg-slate-950/55 backdrop-blur-[2px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              </Dialog.Overlay>
              <Dialog.Content
                asChild
                aria-describedby={undefined}
                onCloseAutoFocus={event => {
                  event.preventDefault();
                  document
                    .querySelector<HTMLButtonElement>(
                      '[data-onesa-bubble-trigger="true"]'
                    )
                    ?.focus();
                }}
              >
                <motion.section
                  data-onesa-chat-modal="true"
                  initial={
                    isMobileViewport
                      ? { opacity: 0, y: 40 }
                      : { opacity: 0, y: 24, scale: 0.98 }
                  }
                  animate={
                    isMobileViewport
                      ? { opacity: 1, y: 0 }
                      : { opacity: 1, y: 0, scale: 1 }
                  }
                  exit={
                    isMobileViewport
                      ? { opacity: 0, y: 40 }
                      : { opacity: 0, y: 16, scale: 0.98 }
                  }
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`fixed z-[250] overflow-hidden border border-zim-gold/20 bg-slate-950/95 shadow-[0_28px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl ${
                    isMobileViewport
                      ? "bottom-4 left-3 right-3 top-[6.5rem] rounded-[1.4rem]"
                      : "bottom-24 right-5 h-[min(72vh,640px)] w-[min(440px,calc(100vw-2rem))] rounded-[1.8rem] md:right-10"
                  }`}
                >
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zim-gold">
                          {t("onesa.brand", { defaultValue: "Onesa" })}
                        </p>
                        <Dialog.Title asChild>
                          <h2 className="truncate !text-sm font-black text-white">
                            {t("onesa.title", {
                              defaultValue: "Chat with Onesa AI",
                            })}
                          </h2>
                        </Dialog.Title>
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
                              onesaIsOnline
                                ? "bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.9)]"
                                : "bg-red-400"
                            }`}
                          />
                          {onesaIsOnline
                            ? t("onesa.online_text", { defaultValue: "Online" })
                            : t("onesa.offline_text", {
                                defaultValue: "Offline",
                              })}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("close", { defaultValue: "Close" })}
                          onClick={() => setIsOnesaChatOpen(false)}
                          className="h-8 w-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {onesaStatus ? (
                      <p className="border-b border-white/10 px-4 py-2 text-[11px] leading-relaxed text-white/70">
                        {onesaStatus}
                      </p>
                    ) : null}

                    <div className="flex-1 overflow-y-auto px-4 py-4">
                      <div className="space-y-4">
                        {onesaMessages.map((message, index) => (
                          <div
                            key={`${message.role}-${index}`}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[92%] px-3 py-2 text-sm leading-relaxed ${
                                message.role === "user"
                                  ? "rounded-[1.25rem] rounded-br-[0.45rem] border border-zim-gold/30 bg-slate-900/90 text-white"
                                  : "rounded-[1.25rem] rounded-bl-[0.45rem] border border-zim-gold/45 bg-zim-gold/10 text-white shadow-[0_0_24px_rgba(212,175,55,0.22)]"
                              }`}
                            >
                              <FormattedChatMessage
                                content={message.content}
                                className="text-sm leading-relaxed"
                              />
                              {message.truncated ? (
                                <p
                                  className="mt-2 text-xs text-zim-gold"
                                  role="status"
                                >
                                  {t("onesa.response_incomplete", {
                                    defaultValue:
                                      "This answer was cut short. Ask Onesa to continue.",
                                  })}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                        <div ref={onesaMessagesEndRef} />
                      </div>
                    </div>

                    <form
                      onSubmit={handleOnesaPopupSubmit}
                      className="space-y-2 border-t border-white/10 px-4 py-3"
                    >
                      <Textarea
                        aria-label={t("onesa.message_label", {
                          defaultValue: "Message to Onesa",
                        })}
                        value={onesaInput}
                        onChange={event => setOnesaInput(event.target.value)}
                        onKeyDown={handleOnesaPopupInputKeyDown}
                        placeholder={
                          hasOnesaChatStarted
                            ? ""
                            : t("onesa.starter_prompt", {
                                defaultValue: "Start chat....",
                              })
                        }
                        className="min-h-[96px] border-white/20 bg-white/[0.02] text-white placeholder:text-white/70"
                      />
                      {onesaError ? (
                        <p role="alert" className="text-xs text-red-400">
                          {onesaError}
                          {onesaRetryAfterSecondsRemaining !== null
                            ? ` (${onesaRetryAfterSecondsRemaining}s)`
                            : ""}
                        </p>
                      ) : null}
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={
                            onesaLoading ||
                            !onesaInput.trim() ||
                            (onesaRetryAfterSecondsRemaining ?? 0) > 0
                          }
                          className="rounded-full bg-zim-gold px-6 text-[11px] font-black uppercase tracking-widest text-zim-black hover:bg-white"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {onesaLoading
                            ? t("onesa.thinking", {
                                defaultValue: "Thinking...",
                              })
                            : t("onesa.send", { defaultValue: "Send" })}
                        </Button>
                      </div>
                    </form>
                  </div>
                </motion.section>
              </Dialog.Content>
            </Dialog.Portal>
          ) : null}
        </AnimatePresence>
      </Dialog.Root>
    </>
  );
}
