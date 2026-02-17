import { KeyboardEvent, useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Brain, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function OnesaAI() {
  const { t } = useTranslation();
  const starterPrompt = t("onesa.starter_prompt", {
    defaultValue:
      "I want diaspora-focused investment opportunities in Zimbabwe with regulatory requirements and estimated return ranges.",
  });
  const onlineAria = t("onesa.online_indicator_aria", { defaultValue: "Onesa online" });
  const statusPrefix = t("onesa.status_prefix", { defaultValue: "Onesa status" });
  const genericContactError = t("onesa.error_unable_contact", {
    defaultValue:
      "Unable to contact Onesa AI right now. Ensure backend is running (`pnpm dev:server`) and Ollama is active (`ollama serve`).",
  });
  const backendUnreachableStatus = t("onesa.status_backend_unreachable", {
    defaultValue:
      "Onesa status: Backend unreachable. Start `pnpm dev:server`, `ollama serve`, and ensure ONESA_MODEL exists.",
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

  useEffect(() => {
    let mounted = true;
    async function checkHealth() {
      try {
        const { data } = await api.get("/onesa/health");
        if (!mounted) return;
        const online = Boolean(data?.ok);
        setIsOnline(online);
        setStatus(
          online
            ? ""
            : `${statusPrefix}: ${String(
                data?.message ?? t("onesa.status_offline", { defaultValue: "Offline" })
              )}`
        );
      } catch (err: any) {
        if (!mounted) return;
        setIsOnline(false);
        const responseMessage = err?.response?.data?.message;
        if (responseMessage) {
          setStatus(`${statusPrefix}: ${String(responseMessage)}`);
          return;
        }
        setStatus(backendUnreachableStatus);
      }
    }
    void checkHealth();
    return () => {
      mounted = false;
    };
  }, [backendUnreachableStatus, statusPrefix, t]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/onesa/chat", {
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      });
      const reply = String(data?.reply ?? "").trim();
      if (!reply) throw new Error("Empty model response.");
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      const responseMessage = err?.response?.data?.message;
      const message = responseMessage ?? genericContactError;
      setError(message);
    } finally {
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
              {isOnline ? (
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-3 py-1 shadow-[0_0_16px_rgba(74,222,128,0.45)]"
                  aria-label={onlineAria}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.9)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 animate-pulse">
                    {t("onesa.online_text", { defaultValue: "Online" })}
                  </span>
                </span>
              ) : null}
            </div>
            <p className="text-white/60 max-w-3xl">
              {t("onesa.subtitle", {
                defaultValue:
                  "This assistant is wired to your open-source model endpoint. You can swap models or use a fine-tuned checkpoint later via environment variables.",
              })}
            </p>
            {status ? <p className="text-white/60 max-w-3xl text-sm">{status}</p> : null}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-4 md:p-6">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[90%] md:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-zim-gold text-zim-black font-medium"
                        : "bg-white/[0.06] border border-white/10 text-white/90"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="flex items-center gap-2 mb-2 text-zim-gold text-[10px] uppercase tracking-widest font-black">
                        <Brain className="h-3 w-3" /> {t("onesa.badge", { defaultValue: "Onesa AI" })}
                      </div>
                    ) : null}
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
                placeholder={starterPrompt}
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
