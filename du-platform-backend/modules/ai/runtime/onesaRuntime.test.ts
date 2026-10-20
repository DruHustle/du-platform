import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOnesaRouteDeps } from "./onesaRuntime";

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
    get.mockResolvedValue({ data: { models: [] } });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("cleans repeated text in a non-truncated cloud response", async () => {
    post.mockResolvedValueOnce(cloudReply(`- ${repeated}\n* ${complete}`));
    const result = await getOnesaRouteDeps().generateOnesaReply(prompt, "en");
    expect(result.reply).toBe(`* ${complete}`);
    expect(result.truncated).toBe(false);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("joins a restarted cloud continuation once and returns the final completion status", async () => {
    post.mockResolvedValueOnce(cloudReply(repeated, "length"));
    post.mockResolvedValueOnce(cloudReply(complete));
    const result = await getOnesaRouteDeps().generateOnesaReply(prompt, "en");
    expect(result).toEqual({
      reply: complete,
      truncated: false,
      finishReason: "stop",
    });
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("keeps the initial partial reply if requesting a continuation fails", async () => {
    post.mockResolvedValueOnce(cloudReply(repeated, "length"));
    post.mockRejectedValueOnce({ response: { status: 400 } });
    const result = await getOnesaRouteDeps().generateOnesaReply(prompt, "en");
    expect(result).toEqual({
      reply: repeated,
      truncated: true,
      finishReason: "length",
    });
  });

  it("cleans repeated text from the local model too", async () => {
    vi.stubEnv("ONESA_PROVIDER", "ollama");
    post.mockResolvedValueOnce({
      data: { message: { content: `${repeated}\n${complete}` } },
    });
    const result = await getOnesaRouteDeps().generateOnesaReply(prompt, "en");
    expect(result.reply).toBe(complete);
  });

  it("merges overlapping Anthropic continuations too", async () => {
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
      data: { message: { content: "I am Grok." } },
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

  it("guards identity text introduced by a continuation", async () => {
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
