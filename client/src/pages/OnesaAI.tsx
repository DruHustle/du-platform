import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function OnesaAI() {
  const { t, i18n } = useTranslation();
  const starterPrompt = t("onesa.starter_prompt", {
    defaultValue: "Start chat....",
  });
  const onlineAria = t("onesa.online_indicator_aria", { defaultValue: "Onesa online" });
  const genericContactError = t("onesa.error_unable_contact", {
    defaultValue: "Onesa is currently unavailable. Please try again shortly.",
  });
  const rateLimitedError = t("onesa.error_rate_limited", {
    defaultValue: "Onesa is busy right now. Please try again in a few seconds.",
  });
  const backendUnreachableStatus = t("onesa.status_backend_unreachable", {
    defaultValue: "Onesa is currently unavailable. Please try again shortly.",
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: t("onesa.welcome", {
        defaultValue:
          "I am an expert on Zimbabwe. Let me help you navigate everything from investment, trade, and tourism to your day-to-day tasks.",
      }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const loadingRef = useRef(false);
  const hasChatStarted = messages.some((message) => message.role === "user");

  const checkHealth = useCallback(async (): Promise<boolean> => {
    const parseObjectPayload = (payload: unknown): Record<string, any> | null => {
      if (typeof payload === "object" && payload !== null) return payload as Record<string, any>;
      if (typeof payload === "string") {
        try {
          const parsed = JSON.parse(payload);
          return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, any>) : null;
        } catch {
          return null;
        }
      }
      return null;
    };

    const checkLegacyHealth = async (): Promise<boolean> => {
      try {
        const response = await api.get("/onesa/health", { timeout: 10000 });
        const payload = parseObjectPayload(response.data);
        const online = Boolean(payload?.ok ?? payload?.modelAvailable);
        setIsOnline(online);
        setStatus(online ? "" : backendUnreachableStatus);
        return online;
      } catch {
        setIsOnline(false);
        setStatus(backendUnreachableStatus);
        return false;
      }
    };

    try {
      const response = await api.get("/onesa/ready", { timeout: 12000 });
      const payload = parseObjectPayload(response.data);
      if (!payload) {
        return await checkLegacyHealth();
      }
      const online = Boolean(payload?.ready === true);
      setIsOnline(online);
      setStatus(online ? "" : backendUnreachableStatus);
      return online;
    } catch (err: any) {
      // Backward compatibility: older backends may not expose /api/onesa/ready.
      if (Number(err?.response?.status) === 404) {
        return await checkLegacyHealth();
      }
      setIsOnline(false);
      setStatus(backendUnreachableStatus);
      return false;
    }
  }, [backendUnreachableStatus]);

  useEffect(() => {
    let mounted = true;
    const runHealthCheck = async () => {
      if (!mounted) return;
      await checkHealth();
    };
    void runHealthCheck();
    const intervalId = window.setInterval(() => {
      if (loadingRef.current) return;
      void runHealthCheck();
    }, 30000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [checkHealth]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    // Do not hard-block sends on readiness probes; chat endpoint can still recover via fallback.
    void checkHealth();

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    loadingRef.current = true;
    setLoading(true);

    try {
      const { data } = await api.post(
        "/onesa/chat",
        {
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          language: i18n.resolvedLanguage ?? i18n.language ?? "en",
        },
        { timeout: 180000 }
      );
      const reply = String(data?.reply ?? "").trim();
      if (!reply) throw new Error("Empty model response.");
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setIsOnline(true);
      setStatus("");
    } catch (err: any) {
      const status = Number(err?.response?.status ?? 0);
      const responseMessage = err?.response?.data?.message;
      const retryAfterMs = Number(err?.response?.data?.retryAfterMs ?? 0);
      const retryAfterSeconds = retryAfterMs > 0 ? Math.max(1, Math.ceil(retryAfterMs / 1000)) : null;
      const isRateLimited =
        status === 429 ||
        /status code 429|rate limit|too many requests/i.test(String(err?.message ?? responseMessage ?? ""));
      const rateLimitedMessage = isRateLimited
        ? retryAfterSeconds
          ? `${rateLimitedError} (${retryAfterSeconds}s)`
          : rateLimitedError
        : null;
      const timeoutMessage =
        err?.code === "ECONNABORTED"
          ? t("onesa.error_timeout", { defaultValue: "Onesa request timed out after 3 minutes. Please try again." })
          : null;
      const safeResponseMessage =
        typeof responseMessage === "string" && !/status code \d+/i.test(responseMessage) ? responseMessage : null;
      const message = rateLimitedMessage ?? timeoutMessage ?? safeResponseMessage ?? genericContactError;
      setError(message);
      if (!isRateLimited) {
        void checkHealth();
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendMessage();
  };

  const handleInputKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await sendMessage();
    }
  };

  return (
    <Layout>
      <section className="min-h-screen bg-slate-950 px-6 py-24">
        <div className="container mx-auto max-w-5xl space-y-6">
          <div className="space-y-3 text-white">
            <Badge className="bg-zim-gold/10 text-zim-gold border border-zim-gold/20 uppercase tracking-widest text-[10px] font-black">
              {t("onesa.badge", { defaultValue: "Onesa AI" })}
            </Badge>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter">
                {t("onesa.title", { defaultValue: "Chat with Onesa AI" })}
              </h1>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${
                  isOnline
                    ? "border border-emerald-300/40 bg-emerald-500/15 shadow-[0_0_16px_rgba(74,222,128,0.45)]"
                    : "border border-red-300/40 bg-red-500/15 shadow-[0_0_16px_rgba(248,113,113,0.45)]"
                }`}
                aria-label={onlineAria}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isOnline
                      ? "bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.9)]"
                      : "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.9)]"
                  }`}
                />
                <span
                  className={`text-[10px] font-black uppercase tracking-widest animate-pulse ${
                    isOnline ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {isOnline
                    ? t("onesa.online_text", { defaultValue: "Online" })
                    : t("onesa.offline_text", { defaultValue: "Offline" })}
                </span>
              </span>
            </div>
            {status ? <p className="text-white/60 max-w-3xl text-sm">{status}</p> : null}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-4 md:p-6">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[90%] md:max-w-[75%] px-3 py-2 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "rounded-[1.35rem] rounded-br-[0.45rem]"
                        : "rounded-[1.35rem] rounded-bl-[0.45rem]"
                    } ${
                      message.role === "user"
                        ? "bg-slate-900/90 border border-zim-gold/30 text-white"
                        : "bg-zim-gold/10 border border-zim-gold/45 text-white shadow-[0_0_24px_rgba(212,175,55,0.24)]"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={hasChatStarted ? "" : starterPrompt}
                className="min-h-[110px] bg-white/[0.02] border-white/20 text-white placeholder:text-white/30"
              />
              {error ? <p className="text-red-400 text-sm">{error}</p> : null}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[11px] rounded-full px-7"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {loading
                    ? t("onesa.thinking", { defaultValue: "Thinking..." })
                    : t("onesa.send", { defaultValue: "Send" })}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
}
