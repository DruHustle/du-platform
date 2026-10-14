import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FormattedChatMessage from "@/components/FormattedChatMessage";
import { getApiErrorMessage } from "@/lib/api";
import {
  checkOnesaHealth,
  OnesaChatMessage,
  sendOnesaChatMessage,
} from "@/modules/ai/lib/aiApi";
import { ArrowLeft, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

export default function ChatPage() {
  const { t, i18n } = useTranslation();
  const starterPrompt = t("onesa.starter_prompt", {
    defaultValue: "Start chat....",
  });
  const onlineAria = t("onesa.online_indicator_aria", {
    defaultValue: "Onesa online",
  });
  const genericContactError = t("onesa.error_unable_contact", {
    defaultValue: "Onesa is currently unavailable. AI mode is off",
  });
  const rateLimitedError = t("onesa.error_rate_limited", {
    defaultValue: "Onesa is busy right now. Please try again in a few seconds.",
  });
  const backendUnreachableStatus = t("onesa.status_backend_unreachable", {
    defaultValue: "Onesa is currently unavailable. AI mode is off",
  });
  const backLabel = t("common.back", { defaultValue: "Back" });

  const [messages, setMessages] = useState<OnesaChatMessage[]>([
    {
      role: "assistant",
      content: t("onesa.welcome", {
        defaultValue:
          "I am an expert on Zimbabwe. Let me help you navigate everything from investment, technology, and tourism to your day-to-day tasks.",
      }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryAfterSecondsRemaining, setRetryAfterSecondsRemaining] = useState<
    number | null
  >(null);
  const [status, setStatus] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasChatStarted = messages.some(message => message.role === "user");

  const scrollMessagesToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    },
    []
  );

  useEffect(() => {
    if (retryAfterSecondsRemaining === null) return;
    if (retryAfterSecondsRemaining <= 0) {
      setRetryAfterSecondsRemaining(null);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setRetryAfterSecondsRemaining(current => {
        if (current === null) return null;
        return Math.max(0, current - 1);
      });
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [retryAfterSecondsRemaining]);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    const health = await checkOnesaHealth(backendUnreachableStatus);
    setIsOnline(health.online);
    setStatus(health.statusText);
    return health.online;
  }, [backendUnreachableStatus]);

  useEffect(() => {
    let mounted = true;
    const runHealthCheck = async () => {
      if (!mounted) return;
      await checkHealth();
    };
    void runHealthCheck();
    return () => {
      mounted = false;
    };
  }, [checkHealth]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      scrollMessagesToBottom(messages.length <= 1 ? "auto" : "smooth");
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [messages, loading, scrollMessagesToBottom]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    void checkHealth();

    const nextMessages: OnesaChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setRetryAfterSecondsRemaining(null);
    setLoading(true);

    try {
      const { data } = await sendOnesaChatMessage({
        messages: nextMessages,
        language: i18n.resolvedLanguage ?? i18n.language ?? "en",
      });
      const reply = String(data?.reply ?? "").trim();
      if (!reply) throw new Error("Empty model response.");
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setIsOnline(true);
      setStatus("");
    } catch (err: any) {
      const status = Number(err?.response?.status ?? 0);
      const responseMessage = getApiErrorMessage(err, "");
      const retryAfterMs = Number(err?.response?.data?.retryAfterMs ?? 0);
      const retryAfterSeconds =
        retryAfterMs > 0 ? Math.max(1, Math.ceil(retryAfterMs / 1000)) : null;
      const isRateLimited =
        status === 429 ||
        /status code 429|rate limit|too many requests/i.test(
          String(err?.message ?? responseMessage ?? "")
        );
      setRetryAfterSecondsRemaining(isRateLimited ? retryAfterSeconds : null);
      const rateLimitedMessage = isRateLimited ? rateLimitedError : null;
      const timeoutMessage =
        err?.code === "ECONNABORTED"
          ? t("onesa.error_timeout", {
              defaultValue: "Onesa request timed out. Please try again.",
            })
          : null;
      const safeResponseMessage =
        typeof responseMessage === "string" &&
        !/status code \d+/i.test(responseMessage)
          ? responseMessage
          : null;
      const message =
        rateLimitedMessage ??
        timeoutMessage ??
        safeResponseMessage ??
        genericContactError;
      setError(message);
      if (!isRateLimited) {
        void checkHealth();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendMessage();
  };

  const handleInputKeyDown = async (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await sendMessage();
    }
  };

  return (
    <Layout>
      <section className="min-h-screen bg-slate-950 px-3 py-3 md:px-6 md:py-24">
        <div className="mx-auto flex min-h-screen w-full md:max-w-[440px]">
          <div className="outer-glass-panel flex w-full flex-1 flex-col overflow-hidden rounded-[2rem] border border-zim-gold/20 bg-slate-950/95 !p-0 shadow-[0_28px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl md:rounded-[1.8rem] md:min-h-[min(72vh,640px)]">
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Button
                    asChild
                    className="h-8 rounded-full border border-white/15 bg-slate-900 px-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800"
                  >
                    <Link href="/tourism">
                      <ArrowLeft className="h-4 w-4" />
                      {backLabel}
                    </Link>
                  </Button>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zim-gold">
                      {t("onesa.badge", { defaultValue: "Onesa AI" })}
                    </p>
                    <h1 className="truncate !text-sm font-black text-white">
                      {t("onesa.title", { defaultValue: "Chat with Onesa AI" })}
                    </h1>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    isOnline
                      ? "border border-emerald-300/40 bg-emerald-500/15 text-emerald-300"
                      : "border border-red-300/40 bg-red-500/15 text-red-300"
                  }`}
                  aria-label={onlineAria}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isOnline
                        ? "bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.9)]"
                        : "bg-red-400"
                    }`}
                  />
                  {isOnline
                    ? t("onesa.online_text", { defaultValue: "Online" })
                    : t("onesa.offline_text", { defaultValue: "Offline" })}
                </span>
              </div>

              {status ? (
                <p className="border-b border-white/10 px-4 py-2 text-[11px] leading-relaxed text-white/70">
                  {status}
                </p>
              ) : null}

              <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
                <div className="space-y-4">
                  {messages.map((message, index) => (
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
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-2 border-t border-white/10 px-4 py-3"
              >
                <Textarea
                  aria-label={t("onesa.message_label", {
                    defaultValue: "Message to Onesa",
                  })}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={hasChatStarted ? "" : starterPrompt}
                  className="min-h-[96px] border-white/20 bg-white/[0.02] text-white placeholder:text-white/70"
                />
                {error ? (
                  <p role="alert" className="text-xs text-red-400">
                    {error}
                    {error === rateLimitedError &&
                    retryAfterSecondsRemaining !== null
                      ? ` (${retryAfterSecondsRemaining}s)`
                      : ""}
                  </p>
                ) : null}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="rounded-full bg-zim-gold px-6 text-[11px] font-black uppercase tracking-widest text-zim-black hover:bg-white"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {loading
                      ? t("onesa.thinking", { defaultValue: "Thinking..." })
                      : t("onesa.send", { defaultValue: "Send" })}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
