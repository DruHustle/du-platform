import { watchOnesaRecovery } from "../lib/onesaRecovery";
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FormattedChatMessage from "@/components/FormattedChatMessage";
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
    defaultValue: "Ask about Zimbabwe…",
  });
  const onlineAria = t("onesa.online_indicator_aria", {
    defaultValue: "Onesa online",
  });
  const genericContactError = t("onesa.error_unable_contact", {
    defaultValue: "Onesa is unavailable right now. Please try again later.",
  });
  const rateLimitedError = t("onesa.error_rate_limited", {
    defaultValue: "Onesa is busy right now. Please try again in a few seconds.",
  });
  const backendUnreachableStatus = t("onesa.status_backend_unreachable", {
    defaultValue: "Onesa is unavailable right now. Please try again later.",
  });
  const backLabel = t("common.back", { defaultValue: "Back" });

  const welcomeMessage = t("onesa.welcome", {
    defaultValue:
      "I can help you explore Zimbabwean products, travel ideas and project information. What would you like to know?",
  });
  const [messages, setMessages] = useState<OnesaChatMessage[]>([
    {
      role: "assistant",
      content: welcomeMessage,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryAfterSecondsRemaining, setRetryAfterSecondsRemaining] = useState<
    number | null
  >(null);
  const [status, setStatus] = useState("");
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const requestInFlightRef = useRef(false);
  const healthCheckVersionRef = useRef(0);
  const hasChatStarted = messages.some(message => message.role === "user");

  useEffect(() => {
    setMessages(current =>
      current.some(message => message.role === "user")
        ? current
        : [{ role: "assistant", content: welcomeMessage }]
    );
  }, [welcomeMessage]);

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
    const version = ++healthCheckVersionRef.current;
    const health = await checkOnesaHealth(backendUnreachableStatus);
    if (version === healthCheckVersionRef.current) {
      setIsOnline(health.online);
      setStatus(health.statusText);
    }
    return health.online;
  }, [backendUnreachableStatus]);

  useEffect(() => {
    const stop = watchOnesaRecovery(checkHealth);
    return () => {
      stop();
      healthCheckVersionRef.current += 1;
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
    if (
      !trimmed ||
      requestInFlightRef.current ||
      (retryAfterSecondsRemaining ?? 0) > 0
    )
      return;
    requestInFlightRef.current = true;

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
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: reply, truncated: data.truncated },
      ]);
      healthCheckVersionRef.current += 1;
      setIsOnline(true);
      setStatus("");
    } catch (err: any) {
      const status = Number(err?.response?.status ?? 0);
      const retryAfterMs = Number(err?.response?.data?.retryAfterMs ?? 0);
      const retryAfterSeconds =
        retryAfterMs > 0 ? Math.max(1, Math.ceil(retryAfterMs / 1000)) : null;
      const isRateLimited =
        status === 429 ||
        /status code 429|rate limit|too many requests/i.test(
          String(err?.message ?? "")
        );
      setRetryAfterSecondsRemaining(isRateLimited ? retryAfterSeconds : null);
      const rateLimitedMessage = isRateLimited ? rateLimitedError : null;
      const timeoutMessage =
        err?.code === "ECONNABORTED"
          ? t("onesa.error_timeout", {
              defaultValue: "Onesa request timed out. Please try again.",
            })
          : null;
      const incompleteMessage =
        err?.code === "ONESA_INCOMPLETE_REPLY" ||
        err?.response?.data?.code === "ONESA_INCOMPLETE_REPLY"
          ? t("onesa.error_incomplete", {
              defaultValue:
                "Onesa couldn't finish this answer. Please try again or ask for a shorter answer.",
            })
          : null;
      const message =
        rateLimitedMessage ??
        timeoutMessage ??
        incompleteMessage ??
        genericContactError;
      setError(message);
      setMessages(nextMessages.slice(0, -1));
      setInput(current => current || trimmed);
      if (!isRateLimited) {
        void checkHealth();
      }
    } finally {
      requestInFlightRef.current = false;
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
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      await sendMessage();
    }
  };

  return (
    <Layout>
      <section className="chat-section bg-slate-950 px-4 py-6 lg:pt-28 lg:pb-12">
        <div className="chat-workspace mx-auto flex w-full">
          <div className="content-panel flex w-full flex-1 flex-col overflow-hidden rounded-[2rem] border border-zim-gold/20 bg-slate-950/95 !p-0 shadow-[0_28px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl md:rounded-[1.8rem] md:min-h-[min(72vh,640px)]">
            <div className="flex flex-1 min-h-0 flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="flex min-w-0 flex-1 basis-48 flex-wrap items-center gap-3">
                  <Button
                    asChild
                    className="h-auto min-h-8 max-w-full whitespace-normal rounded-full border border-white/15 bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800"
                  >
                    <Link href="/tourism">
                      <ArrowLeft className="h-4 w-4" />
                      {backLabel}
                    </Link>
                  </Button>
                  <div className="min-w-0 flex-1 basis-32">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zim-gold">
                      {t("onesa.badge", { defaultValue: "Onesa AI" })}
                    </p>
                    <h1 className="font-semibold text-white">
                      {t("onesa.title", { defaultValue: "Chat with Onesa AI" })}
                    </h1>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    isOnline
                      ? "border border-emerald-300/40 bg-emerald-500/15 text-emerald-300"
                      : isOnline === null
                        ? "border border-white/20 bg-white/10 text-white/70"
                        : "border border-red-300/40 bg-red-500/15 text-red-300"
                  }`}
                  aria-label={
                    isOnline === null
                      ? t("onesa.checking_text")
                      : isOnline
                        ? onlineAria
                        : t("onesa.offline_text")
                  }
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isOnline
                        ? "bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.9)]"
                        : isOnline === null
                          ? "bg-slate-400"
                          : "bg-red-400"
                    }`}
                  />
                  {isOnline === null
                    ? t("onesa.checking_text")
                    : isOnline
                      ? t("onesa.online_text", { defaultValue: "Online" })
                      : t("onesa.offline_text", { defaultValue: "Offline" })}
                </span>
              </div>

              {status ? (
                <p className="border-b border-white/10 px-4 py-2 text-[11px] leading-relaxed text-white/70">
                  {status}
                </p>
              ) : null}

              <div
                role="log"
                aria-label={t("onesa.title")}
                aria-live="polite"
                aria-relevant="additions"
                aria-busy={loading}
                className="flex-1 overflow-y-auto px-4 py-4 min-h-0"
              >
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
                            : "rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.04] text-white"
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
                    disabled={
                      loading ||
                      !input.trim() ||
                      (retryAfterSecondsRemaining ?? 0) > 0
                    }
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
