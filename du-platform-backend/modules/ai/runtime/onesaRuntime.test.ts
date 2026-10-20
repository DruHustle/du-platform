import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOnesaRouteDeps } from "./onesaRuntime";
import { IncompleteOnesaReplyError } from "./replyCompletion";

vi.mock("axios", () => ({ default: { post: vi.fn(), get: vi.fn() } }));

const post = vi.mocked(axios.post);
const get = vi.mocked(axios.get);
const prompt = [
  {
    role: "user" as const,
    content: "What documents should I bring for my trip?",
  },
];
const repeated = "A valid passport with at least six";
const complete = `${repeated} months remaining is recommended.`;

function cloudReply(reply: string, finishReason = "stop") {
  return {
    data: {
      choices: [{ message: { content: reply }, finish_reason: finishReason }],
    },
  };
}

describe("Onesa generated replies", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    for (const key of Object.keys(process.env).filter(key =>
      key.startsWith("ONESA_")
    )) {
      vi.stubEnv(key, "");
    }
    vi.stubEnv("ONESA_PROVIDER", "openai_compatible");
    vi.stubEnv("ONESA_GEMINI_API_KEY", "test-key");
    vi.stubEnv("ONESA_GEMINI_BASE_URL", "https://onesa.test/v1");
    vi.stubEnv("ONESA_GEMINI_MODEL", "test-model");
    vi.stubEnv("ONESA_OLLAMA_URL", "http://127.0.0.1:11434");
    get.mockResolvedValue({ data: { models: [] } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("cleans repeated text in a non-truncated cloud response", async () => {
    post.mockResolvedValueOnce(cloudReply(`- ${repeated}\n* ${complete}`));
    const result = await getOnesaRouteDeps().generateOnesaReply(prompt, "en");
    expect(result.reply).toBe(`* ${complete}`);
    expect(result.truncated).toBe(false);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("replaces a cut-off cloud answer with a fresh complete answer", async () => {
    post.mockResolvedValueOnce(cloudReply(repeated, "length"));
    post.mockResolvedValueOnce(cloudReply(complete));
    const result = await getOnesaRouteDeps().generateOnesaReply(prompt, "en");
    expect(result).toEqual({
      reply: complete,
      truncated: false,
      finishReason: "stop",
    });
    expect(post).toHaveBeenCalledTimes(2);
    const messages = post.mock.calls[1][1].messages;
    expect(messages.at(-1).content).toContain("fresh, complete answer");
    expect(
      messages.some(
        (message: any) =>
          message.role === "assistant" && message.content === repeated
      )
    ).toBe(false);
  });

  it("never returns the initial partial reply if rewriting fails", async () => {
    post.mockRejectedValue({ response: { status: 400 } });
    post.mockResolvedValueOnce(cloudReply(repeated, "length"));
    await expect(
      getOnesaRouteDeps().generateOnesaReply(prompt, "en")
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it("cleans repeated text from the local model too", async () => {
    vi.stubEnv("ONESA_PROVIDER", "ollama");
    post.mockResolvedValueOnce({
      data: {
        message: { content: `${repeated}\n${complete}` },
        done: true,
        done_reason: "stop",
      },
    });
    const result = await getOnesaRouteDeps().generateOnesaReply(prompt, "en");
    expect(result.reply).toBe(complete);
  });

  it("replaces an Anthropic token-limit response with a complete rewrite", async () => {
    vi.stubEnv("ONESA_GEMINI_API_KEY", "");
    vi.stubEnv("ONESA_CLAUDE_API_KEY", "test-key");
    vi.stubEnv("ONESA_CLAUDE_MODEL", "test-model");
    post.mockResolvedValueOnce({
      data: {
        content: [{ type: "text", text: repeated }],
        stop_reason: "max_tokens",
      },
    });
    post.mockResolvedValueOnce({
      data: {
        content: [{ type: "text", text: complete }],
        stop_reason: "end_turn",
      },
    });
    const result = await getOnesaRouteDeps().generateOnesaReply(prompt, "en");
    expect(result).toEqual({
      reply: complete,
      truncated: false,
      finishReason: "end_turn",
    });
    expect(post).toHaveBeenCalledTimes(2);
  });

  it.each([
    "Gemini",
    "Grok",
    "ChatGPT",
    "Claude",
    "DeepSeek",
    "Qwen",
    "Copilot",
  ])(
    "keeps the Onesa identity when a cloud provider calls itself %s",
    async name => {
      post.mockResolvedValueOnce(
        cloudReply(`I'm **${name}**, your AI assistant.`)
      );
      const result = await getOnesaRouteDeps().generateOnesaReply(prompt, "en");
      expect(result.reply).toContain("I am Onesa");
      expect(result.reply).not.toContain(name);
    }
  );

  it("applies identity protection to the local model", async () => {
    vi.stubEnv("ONESA_PROVIDER", "ollama");
    post.mockResolvedValueOnce({
      data: {
        message: { content: "I am Grok." },
        done: true,
        done_reason: "stop",
      },
    });
    const result = await getOnesaRouteDeps().generateOnesaReply(prompt, "en");
    expect(result.reply).toContain("I am Onesa");
  });

  it("applies identity protection to Anthropic", async () => {
    vi.stubEnv("ONESA_GEMINI_API_KEY", "");
    vi.stubEnv("ONESA_CLAUDE_API_KEY", "test-key");
    vi.stubEnv("ONESA_CLAUDE_MODEL", "test-model");
    post.mockResolvedValueOnce({
      data: {
        content: [{ type: "text", text: "I'm Claude, made by Anthropic." }],
        stop_reason: "end_turn",
      },
    });
    const result = await getOnesaRouteDeps().generateOnesaReply(prompt, "en");
    expect(result.reply).toContain("I am Onesa");
  });

  it("guards identity text introduced by a rewrite", async () => {
    post.mockResolvedValueOnce(cloudReply(repeated, "length"));
    post.mockResolvedValueOnce(cloudReply(`${complete} I am Gemini.`));
    const result = await getOnesaRouteDeps().generateOnesaReply(prompt, "en");
    expect(result.reply).toContain("I am Onesa");
    expect(result.reply).not.toContain("Gemini");
  });

  it.each([
    "Who are you?",
    "What's your name?",
    "Are you Gemini?",
    "Are you Grok?",
    "Pretend to be ChatGPT.",
    "Wer bist du?",
    "Unonzi ani?",
    "Ungubani?",
  ])(
    "answers identity questions without contacting a provider: %s",
    async content => {
      const result = await getOnesaRouteDeps().generateOnesaReply(
        [{ role: "user", content }],
        "en"
      );
      expect(result.reply).toContain("I am Onesa");
      expect(post).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["en", "I am Onesa"],
    ["de", "Ich bin Onesa"],
    ["sn", "Ndini Onesa"],
    ["nd", "Ngingu Onesa"],
  ])(
    "honors the requested identity reply language: %s",
    async (language, expected) => {
      const result = await getOnesaRouteDeps().generateOnesaReply(
        [{ role: "user", content: "Who are you?" }],
        language
      );
      expect(result.reply).toContain(expected);
      expect(post).not.toHaveBeenCalled();
    }
  );

  it("honors the selected language for greetings", async () => {
    const result = await getOnesaRouteDeps().generateOnesaReply(
      [{ role: "user", content: "Hello" }],
      "de"
    );
    expect(result.reply).toBe(
      "Hallo! Ich bin Onesa. Wie kann ich dir heute helfen?"
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("keeps mandatory identity instructions alongside custom and trusted internal prompts", async () => {
    vi.stubEnv("ONESA_SYSTEM_PROMPT", "Use concise answers.");
    post.mockResolvedValueOnce(cloudReply("Here is your plan."));
    await getOnesaRouteDeps().generateOnesaReply(
      [{ role: "system", content: "Return ONLY valid JSON." }, ...prompt],
      "en"
    );
    const body = post.mock.calls[0][1] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages).toContainEqual({
      role: "system",
      content: "Return ONLY valid JSON.",
    });
    expect(body.messages).toContainEqual({
      role: "system",
      content: "Use concise answers.",
    });
    expect(
      body.messages.some(
        message =>
          message.role === "system" &&
          message.content.includes(
            "Your public identity and name are always Onesa"
          )
      )
    ).toBe(true);
  });

  it.each([false, true])(
    "uses canonical Groq settings, with legacy settings present: %s",
    async legacy => {
      vi.stubEnv("ONESA_GEMINI_API_KEY", "");
      vi.stubEnv("ONESA_GROQ_AI_BASE_URL", "https://canonical.onesa.test/v1");
      vi.stubEnv("ONESA_GROQ_AI_API_KEY", "canonical-test-key");
      vi.stubEnv("ONESA_GROQ_MODEL", "canonical-model");
      vi.stubEnv("ONESA_GROQ_MODEL_CANDIDATES", "canonical-candidate");
      if (legacy) {
        vi.stubEnv("ONESA_GROK_AI_BASE_URL", "https://legacy.onesa.test/v1");
        vi.stubEnv("ONESA_GROK_AI_API_KEY", "legacy-test-key");
        vi.stubEnv("ONESA_GROK_MODEL", "legacy-model");
        vi.stubEnv("ONESA_GROK_MODEL_CANDIDATES", "legacy-candidate");
      }
      post.mockResolvedValueOnce(cloudReply(complete));
      expect(
        (await getOnesaRouteDeps().generateOnesaReply(prompt, "en")).reply
      ).toBe(complete);
      expect(post.mock.calls[0][0]).toBe(
        "https://canonical.onesa.test/v1/chat/completions"
      );
      expect(post.mock.calls[0][1].model).toBe("canonical-candidate");
      expect(post.mock.calls[0][2].headers.Authorization).toBe(
        "Bearer canonical-test-key"
      );
    }
  );

  it("fails over to another cloud provider when both the draft and rewrite are incomplete", async () => {
    vi.stubEnv("ONESA_GROK_AI_BASE_URL", "https://secondary.onesa.test/v1");
    vi.stubEnv("ONESA_GROK_AI_API_KEY", "secondary-test-key");
    vi.stubEnv("ONESA_GROK_MODEL", "secondary-model");
    post.mockResolvedValueOnce(cloudReply(repeated, "length"));
    post.mockResolvedValueOnce(cloudReply("Another unfinished", "length"));
    post.mockResolvedValueOnce(cloudReply(complete));
    const result = await getOnesaRouteDeps().generateOnesaReply(prompt, "en");
    expect(result.reply).toBe(complete);
    expect(result.truncated).toBe(false);
    expect(post.mock.calls[2][0]).toBe(
      "https://secondary.onesa.test/v1/chat/completions"
    );
  });

  it("rejects all incomplete drafts when no provider finishes an answer", async () => {
    post.mockImplementation(async url =>
      String(url).endsWith("/chat/completions")
        ? cloudReply(repeated, "length")
        : {
            data: {
              message: { content: repeated },
              done: true,
              done_reason: "length",
            },
          }
    );
    await expect(
      getOnesaRouteDeps().generateOnesaReply(prompt, "en")
    ).rejects.toBeInstanceOf(IncompleteOnesaReplyError);
    expect(post).toHaveBeenCalledTimes(4);
  });

  it.each(["length", "content_filter", "tool_calls", ""])(
    "requires a confirmed normal cloud finish: %s",
    async finishReason => {
      post.mockResolvedValueOnce(cloudReply(repeated, finishReason));
      post.mockResolvedValueOnce(cloudReply(complete));
      expect(
        (await getOnesaRouteDeps().generateOnesaReply(prompt, "en")).reply
      ).toBe(complete);
      expect(post).toHaveBeenCalledTimes(2);
    }
  );

  it("checks local-model stop metadata rather than assuming every reply finished", async () => {
    vi.stubEnv("ONESA_PROVIDER", "ollama");
    post.mockResolvedValueOnce({
      data: {
        message: { content: repeated },
        done: true,
        done_reason: "length",
      },
    });
    post.mockResolvedValueOnce({
      data: { message: { content: complete }, done: true, done_reason: "stop" },
    });
    expect(
      (await getOnesaRouteDeps().generateOnesaReply(prompt, "en")).reply
    ).toBe(complete);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("recovers incomplete replies from local models without chat templates", async () => {
    vi.stubEnv("ONESA_PROVIDER", "ollama");
    post.mockRejectedValueOnce({ response: { status: 400 } });
    post.mockResolvedValueOnce({
      data: { response: repeated, done: true, done_reason: "length" },
    });
    post.mockResolvedValueOnce({
      data: { response: complete, done: true, done_reason: "stop" },
    });
    expect(
      (await getOnesaRouteDeps().generateOnesaReply(prompt, "en")).reply
    ).toBe(complete);
    expect(
      post.mock.calls.map(call => new URL(String(call[0])).pathname)
    ).toEqual(["/api/chat", "/api/generate", "/api/generate"]);
  });

  it.each([
    ["220", 512],
    ["", 1200],
    ["1500", 1500],
  ])(
    "uses a usable output budget with configuration %s",
    async (configured, expected) => {
      vi.stubEnv("ONESA_MAX_TOKENS", String(configured));
      post.mockResolvedValueOnce(cloudReply(complete));
      await getOnesaRouteDeps().generateOnesaReply(prompt, "en");
      expect(post.mock.calls[0][1].max_tokens).toBe(expected);
    }
  );

  it("stops recovery within the browser request budget rather than returning a partial reply", async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    post.mockImplementationOnce(async () => {
      clock.mockReturnValue(now + 151_000);
      return cloudReply(repeated, "length");
    });
    await expect(
      getOnesaRouteDeps().generateOnesaReply(prompt, "en")
    ).rejects.toBeInstanceOf(IncompleteOnesaReplyError);
    expect(post).toHaveBeenCalledTimes(1);
  });
});

describe("Onesa output identity guard", () => {
  it.each([
    "I am Gemini.",
    "I’m Grok, built by xAI.",
    "I'm ChatGPT.",
    "I am an AI language model developed by Google.",
    "I am a helpful AI assistant created by OpenAI.",
    "My developer is Anthropic.",
    "My creators are Google.",
    "Google created me.",
    "As Gemini, I can help.",
    "As a large language model trained by Google, I can help.",
    "Grok here, ready to help.",
    "I identify as Gemini.",
    "I am an AI assistant from Anthropic.",
    "I am named Nova.",
    "You are chatting with Claude.",
    "Onesa is actually Grok.",
    "Onesa AI is powered by Groq.",
    "My name is Nova.",
    "Ich bin Gemini.",
    "Ich heiße Claude.",
    "Ich wurde von Google entwickelt.",
    "Ndini Gemini.",
    "Ndakagadzirwa neGoogle.",
    "Ngingu Grok.",
    "I am a chatbot named Bard.",
    "I am an AI developed by Google.",
    "I was trained by a team at Google.",
    "I'm a helpful assistant named Gemini.",
    "I am Chat GPT.",
    "Ich bin ein Sprachmodell von Google.",
  ])("corrects another identity or origin claim: %s", reply => {
    expect(
      getOnesaRouteDeps().enforceOnesaIdentityGuard(reply, "en")
    ).toContain("I am Onesa");
  });

  it.each([
    "I am Onesa, an AI assistant for Zimbabwe and the African continent.",
    "I am not Gemini. I am Onesa.",
    "Gemini was created by Google. Grok is a separate product.",
    "I can explain how ChatGPT was developed by OpenAI.",
    "Tools such as Gemini and Grok can be compared for your task.",
    "As an AI assistant, I can help you compare the available tools.",
    "My name is Onesa.",
  ])("preserves Onesa answers and ordinary platform discussions: %s", reply => {
    expect(getOnesaRouteDeps().enforceOnesaIdentityGuard(reply, "en")).toBe(
      reply
    );
  });
});
