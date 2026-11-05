import express from "express";
import type { Server } from "node:http";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { getOnesaRouteDeps } from "./onesaRuntime";

// Real Axios/HTTP contracts with an isolated local provider, never a billable API.
const deps = getOnesaRouteDeps();
let server: Server;
let origin = "";
let sequence = 0;
let catalogueStatus = 200;
let catalogue: unknown = { data: [{ id: "fixture-model" }] };
let inferenceStatus = 200;
let primaryInferenceStatus: number | undefined;
let primaryCatalogueStatus: number | undefined;
let sharedEndpoint = false;
let firstModelStatus: number | undefined;
let holdCatalogue: (() => Promise<void>) | undefined;
const requests: Array<{ method: string; path: string; model?: string }> = [];
const prompt = [
  {
    role: "user" as const,
    content: "Explain a useful travel preparation step.",
  },
];

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (req.path.startsWith("/local/")) return next();
    const authorized = req.path.includes("/claude/")
      ? req.get("x-api-key") === process.env.ONESA_CLAUDE_API_KEY &&
        req.get("anthropic-version") === "2023-06-01"
      : req.get("authorization") ===
        `Bearer ${req.path.includes("/secondary/") ? process.env.ONESA_GROQ_AI_API_KEY : process.env.ONESA_GEMINI_API_KEY}`;
    const sharedAuthorized =
      sharedEndpoint &&
      req.get("authorization") ===
        `Bearer ${process.env.ONESA_GROQ_AI_API_KEY}`;
    if (!authorized && !sharedAuthorized)
      return res.status(401).json({ error: "Unauthorized" });
    next();
  });
  app.get(/.*/, async (req, res) => {
    requests.push({ method: "GET", path: req.path });
    if (req.path.endsWith("/api/tags")) return res.status(404).json({});
    if (holdCatalogue) await holdCatalogue();
    const status =
      req.get("authorization") === `Bearer ${process.env.ONESA_GEMINI_API_KEY}`
        ? (primaryCatalogueStatus ?? catalogueStatus)
        : catalogueStatus;
    return res.status(status).json(catalogue);
  });
  app.post(/.*/, (req, res) => {
    requests.push({ method: "POST", path: req.path, model: req.body.model });
    if (req.path.startsWith("/local/")) return res.status(404).json({});
    const status =
      req.body.model === "first-model" && firstModelStatus !== undefined
        ? firstModelStatus
        : req.get("authorization") ===
            `Bearer ${process.env.ONESA_GEMINI_API_KEY}`
          ? (primaryInferenceStatus ?? inferenceStatus)
          : inferenceStatus;
    if (status !== 200)
      return res.status(status).json({ error: "Synthetic credential failure" });
    const reply =
      "Bring a valid passport and confirm entry requirements with the relevant authority.";
    return res.json(
      req.path.includes("/claude/")
        ? { content: [{ type: "text", text: reply }], stop_reason: "end_turn" }
        : { choices: [{ message: { content: reply }, finish_reason: "stop" }] }
    );
  });
  server = await new Promise<Server>(resolve => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw Error("Missing isolated provider address");
  origin = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve()))
  );
});
beforeEach(() => {
  for (const key of Object.keys(process.env).filter(key =>
    key.startsWith("ONESA_")
  ))
    vi.stubEnv(key, "");
  sequence++;
  vi.stubEnv("ONESA_PROVIDER", "openai_compatible");
  vi.stubEnv("ONESA_GEMINI_BASE_URL", `${origin}/primary/${sequence}/v1`);
  vi.stubEnv("ONESA_GEMINI_API_KEY", "synthetic-key-must-not-appear");
  vi.stubEnv("ONESA_GEMINI_MODEL", "fixture-model");
  vi.stubEnv("ONESA_AI_FALLBACK_MODEL", "fixture-model");
  vi.stubEnv("ONESA_OLLAMA_URL", `${origin}/local/${sequence}`);
  vi.stubEnv("ONESA_REQUEST_TIMEOUT_MS", "1000");
  catalogueStatus = 200;
  catalogue = { data: [{ id: "fixture-model" }] };
  inferenceStatus = 200;
  primaryInferenceStatus = undefined;
  primaryCatalogueStatus = undefined;
  sharedEndpoint = false;
  firstModelStatus = undefined;
  holdCatalogue = undefined;
  requests.length = 0;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
const generations = () => requests.filter(request => request.method === "POST");
const success = () => deps.generateOnesaReply(prompt, "en");

describe("Cloud readiness requires recent configuration-bound inference", () => {
  it.each([404, 405])(
    "does not qualify an unsupported catalogue endpoint (%s)",
    async status => {
      catalogueStatus = status;
      expect(await deps.getOnesaHealth()).toMatchObject({
        ok: false,
        ready: false,
        reachable: true,
      });
      expect(await deps.getOnesaReadiness()).toMatchObject({
        ok: false,
        ready: false,
      });
      expect(generations()).toHaveLength(0);
    }
  );
  it("separates a listed configured model from verified inference", async () => {
    expect(await deps.getOnesaHealth()).toMatchObject({
      ok: true,
      ready: false,
      modelAvailable: true,
      inferenceVerified: false,
    });
    expect(await deps.getOnesaReadiness()).toMatchObject({
      ok: false,
      ready: false,
      modelAvailable: true,
      inferenceVerified: false,
    });
    expect(generations()).toHaveLength(0);
  });
  it.each([
    { data: [{ id: "unconfigured-model" }] },
    { models: ["fixture-model"] },
    { data: [{ id: 123 }] },
  ])(
    "rejects missing models and malformed catalogue contracts: %j",
    async value => {
      catalogue = value;
      expect(await deps.getOnesaHealth()).toMatchObject({
        ok: false,
        ready: false,
        modelAvailable: false,
      });
      expect(await deps.getOnesaReadiness()).toMatchObject({ ready: false });
      expect(generations()).toHaveLength(0);
    }
  );
  it.each([401, 403])(
    "does not qualify invalid provider authorization (%s)",
    async status => {
      catalogueStatus = status;
      const readiness = await deps.getOnesaReadiness();
      expect(readiness).toMatchObject({ ready: false });
      expect(JSON.stringify(readiness)).not.toContain("synthetic-key");
      expect(generations()).toHaveLength(0);
    }
  );
  it("local identity and greeting responses are not provider evidence", async () => {
    for (const content of ["Hello", "Who are you?"]) {
      await deps.generateOnesaReply([{ role: "user", content }], "en");
      deps.onChatSuccess();
      expect(await deps.getOnesaReadiness()).toMatchObject({ ready: false });
    }
    expect(generations()).toHaveLength(0);
  });
  it("mock-mode replies and readiness cannot warm the real provider", async () => {
    vi.stubEnv("ONESA_MOCK_MODE", "true");
    await success();
    expect(await deps.getOnesaReadiness()).toMatchObject({
      ready: true,
      provider: "mock",
    });
    vi.stubEnv("ONESA_MOCK_MODE", "false");
    expect((await deps.getOnesaReadiness()).ready).toBe(false);
    expect(generations()).toHaveLength(0);
  });
  it.each([200, 404, 405])(
    "qualifies the exact completed request with catalogue status %s and no probe generation",
    async status => {
      catalogueStatus = status;
      await success();
      expect(generations()).toHaveLength(1);
      expect(await deps.getOnesaReadiness()).toMatchObject({
        ok: true,
        ready: true,
        inferenceVerified: true,
        model: "fixture-model",
        endpoint: process.env.ONESA_GEMINI_BASE_URL,
      });
      expect(generations()).toHaveLength(1);
    }
  );
  it.each(["key", "model", "endpoint", "provider", "options"])(
    "does not reuse success or cached readiness after changing %s",
    async field => {
      await success();
      expect((await deps.getOnesaReadiness()).ready).toBe(true);
      if (field === "key")
        vi.stubEnv("ONESA_GEMINI_API_KEY", "new-synthetic-key");
      if (field === "model") {
        vi.stubEnv("ONESA_GEMINI_MODEL", "new-model");
        catalogue = { data: [{ id: "new-model" }] };
      }
      if (field === "endpoint")
        vi.stubEnv("ONESA_GEMINI_BASE_URL", `${origin}/changed/v1`);
      if (field === "provider") {
        vi.stubEnv("ONESA_GEMINI_API_KEY", "");
        vi.stubEnv("ONESA_CLAUDE_API_KEY", "synthetic-claude-key");
        vi.stubEnv("ONESA_CLAUDE_BASE_URL", `${origin}/claude/${sequence}`);
        vi.stubEnv("ONESA_CLAUDE_MODEL", "fixture-model");
      }
      if (field === "options") vi.stubEnv("ONESA_MAX_TOKENS", "2048");
      expect((await deps.getOnesaReadiness()).ready).toBe(false);
      expect(generations()).toHaveLength(1);
    }
  );
  it("does not let the readiness cache extend the generation proof lifetime", async () => {
    const started = Date.now();
    let now = started;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    await success();
    now += 119000;
    expect((await deps.getOnesaReadiness()).ready).toBe(true);
    now += 1001;
    expect((await deps.getOnesaReadiness()).ready).toBe(false);
    expect(generations()).toHaveLength(1);
  });
  it("a later inference denial invalidates previous success immediately", async () => {
    await success();
    expect((await deps.getOnesaReadiness()).ready).toBe(true);
    inferenceStatus = 403;
    await expect(success()).rejects.toMatchObject({
      response: { status: 403 },
    });
    const requestsBefore = generations().length;
    expect((await deps.getOnesaReadiness()).ready).toBe(false);
    expect(generations()).toHaveLength(requestsBefore);
  });
  it("invalidates fallback-model proof when the same target denies the first model", async () => {
    vi.stubEnv("ONESA_GEMINI_MODEL", "first-model");
    catalogue = { data: [{ id: "first-model" }, { id: "fixture-model" }] };
    firstModelStatus = 404;
    await success();
    expect(await deps.getOnesaReadiness()).toMatchObject({
      ready: true,
      model: "fixture-model",
    });
    firstModelStatus = 401;
    await expect(success()).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect((await deps.getOnesaReadiness()).ready).toBe(false);
  });
  it("does not let a catalogue authorization failure reuse recent inference", async () => {
    await success();
    catalogueStatus = 401;
    expect((await deps.getOnesaReadiness()).ready).toBe(false);
    catalogueStatus = 200;
    deps.onChatSuccess();
    expect((await deps.getOnesaReadiness()).ready).toBe(false);
  });
  it("does not claim a removed selected model is still ready", async () => {
    await success();
    catalogue = { data: [{ id: "different-model" }] };
    expect((await deps.getOnesaReadiness()).ready).toBe(false);
  });
  it("uses actual fallback inference instead of a listed but failing primary", async () => {
    vi.stubEnv("ONESA_GROQ_AI_API_KEY", "synthetic-secondary-key");
    vi.stubEnv("ONESA_GROQ_AI_BASE_URL", `${origin}/secondary/${sequence}/v1`);
    vi.stubEnv("ONESA_GROQ_MODEL", "fixture-model");
    primaryInferenceStatus = 403;
    await success();
    expect(generations()).toHaveLength(2);
    expect(await deps.getOnesaReadiness()).toMatchObject({
      ready: true,
      inferenceVerified: true,
      endpoint: process.env.ONESA_GROQ_AI_BASE_URL,
    });
    expect(generations()).toHaveLength(2);
  });
  it("binds successful fallback evidence to its credentials when endpoints and models are shared", async () => {
    sharedEndpoint = true;
    vi.stubEnv("ONESA_GROQ_AI_API_KEY", "synthetic-secondary-key");
    vi.stubEnv("ONESA_GROQ_AI_BASE_URL", process.env.ONESA_GEMINI_BASE_URL!);
    vi.stubEnv("ONESA_GROQ_MODEL", "fixture-model");
    primaryInferenceStatus = 403;
    primaryCatalogueStatus = 403;
    await success();
    expect(generations()).toHaveLength(2);
    expect(await deps.getOnesaReadiness()).toMatchObject({
      ready: true,
      inferenceVerified: true,
    });
    expect(generations()).toHaveLength(2);
  });
  it("does not revive evidence invalidated while the catalogue request was in flight", async () => {
    await success();
    let signalStarted!: () => void;
    let release!: () => void;
    const started = new Promise<void>(resolve => {
      signalStarted = resolve;
    });
    const released = new Promise<void>(resolve => {
      release = resolve;
    });
    holdCatalogue = async () => {
      signalStarted();
      await released;
    };
    const pendingReadiness = deps.getOnesaReadiness();
    await started;
    try {
      inferenceStatus = 403;
      await expect(success()).rejects.toMatchObject({
        response: { status: 403 },
      });
    } finally {
      release();
    }
    expect((await pendingReadiness).ready).toBe(false);
  });
  it("preserves the Anthropic authentication and generation contract", async () => {
    vi.stubEnv("ONESA_GEMINI_API_KEY", "");
    vi.stubEnv("ONESA_CLAUDE_API_KEY", "synthetic-claude-key");
    vi.stubEnv("ONESA_CLAUDE_BASE_URL", `${origin}/claude/${sequence}`);
    vi.stubEnv("ONESA_CLAUDE_MODEL", "fixture-model");
    expect((await deps.getOnesaReadiness()).ready).toBe(false);
    await success();
    expect((await deps.getOnesaReadiness()).ready).toBe(true);
    expect(
      requests.some(request => request.path.endsWith("/v1/messages"))
    ).toBe(true);
    expect(requests.some(request => request.path.endsWith("/v1/models"))).toBe(
      true
    );
  });
});
