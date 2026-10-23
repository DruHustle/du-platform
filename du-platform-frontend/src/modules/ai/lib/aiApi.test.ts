import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import {
  checkOnesaHealth,
  invalidateOfflineOnesaHealth,
  clearOnesaHealthCache,
  sendOnesaChatMessage,
  requestOnesaTripPlan,
} from "./aiApi";

vi.mock("@/lib/api", () => ({ api: { post: vi.fn(), get: vi.fn() } }));
const post = vi.mocked(api.post);
const get = vi.mocked(api.get);
const input = {
  messages: [{ role: "user" as const, content: "Hello" }],
  language: "en",
};

beforeEach(() => {
  vi.resetAllMocks();
  clearOnesaHealthCache();
});

describe("Onesa chat requests", () => {
  it("allows time for generation and strips display metadata", async () => {
    post.mockResolvedValueOnce({
      data: { reply: "  I am Onesa.  ", truncated: false },
    });
    const response = await sendOnesaChatMessage({
      messages: [
        { role: "assistant", content: "A previous answer", truncated: true },
        ...input.messages,
      ],
      language: "en",
    });
    expect(post).toHaveBeenCalledWith(
      "/ai/chat",
      {
        messages: [
          { role: "assistant", content: "A previous answer" },
          ...input.messages,
        ],
        language: "en",
        currency: "EUR",
      },
      { timeout: 180_000 }
    );
    expect(response.data).toEqual({ reply: "I am Onesa.", truncated: false });
  });

  it("forwards cancellation and ignores a response arriving after cancellation", async () => {
    const controller = new AbortController();
    let finish!: (response: unknown) => void;
    post.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const pending = sendOnesaChatMessage({
      ...input,
      signal: controller.signal,
    });
    expect(post.mock.calls[0][2]?.signal).toBe(controller.signal);
    controller.abort();
    finish({ data: { reply: "Stale guidance" } });
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects a cut-off reply even if an older backend returns HTTP 200", async () => {
    post.mockResolvedValueOnce({
      data: { reply: "An unfinished sentence with", truncated: true },
    });
    await expect(sendOnesaChatMessage(input)).rejects.toThrow(
      "Onesa could not finish a complete response."
    );
  });

  it.each([
    null,
    "not JSON",
    {},
    { reply: "  " },
    { reply: {} },
    { reply: 123 },
  ])("rejects malformed replies: %j", async data => {
    post.mockResolvedValueOnce({ data });
    await expect(sendOnesaChatMessage(input)).rejects.toThrow(
      "Onesa returned an empty or invalid response."
    );
  });

  it("accepts a JSON string response", async () => {
    post.mockResolvedValueOnce({
      data: JSON.stringify({ reply: "I am Onesa." }),
    });
    expect((await sendOnesaChatMessage(input)).data).toEqual({
      reply: "I am Onesa.",
      truncated: false,
    });
  });

  it("surfaces request failures to the chat for retry", async () => {
    const error = { response: { status: 429, data: { retryAfterMs: 5000 } } };
    post.mockRejectedValueOnce(error);
    await expect(sendOnesaChatMessage(input)).rejects.toBe(error);
  });
});

describe("Onesa availability", () => {
  it("shares a readiness request between both chat views", async () => {
    get.mockResolvedValueOnce({ data: { ready: true } });
    const results = await Promise.all([
      checkOnesaHealth("Unavailable"),
      checkOnesaHealth("Offline"),
    ]);
    expect(get).toHaveBeenCalledTimes(1);
    expect(results.map(result => result.online)).toEqual([true, true]);
  });

  it("does not mistake a healthy server for an available model", async () => {
    get.mockRejectedValueOnce(new Error("Readiness unavailable"));
    get.mockResolvedValueOnce({ data: { ok: true, modelAvailable: false } });
    expect(await checkOnesaHealth("Unavailable")).toEqual({
      online: false,
      statusText: "Unavailable",
    });
  });

  it("rejects string booleans in readiness and health payloads", async () => {
    get.mockRejectedValueOnce(new Error("Readiness unavailable"));
    get.mockResolvedValueOnce({ data: { ok: "false" } });
    expect((await checkOnesaHealth("Unavailable")).online).toBe(false);
  });

  it("does not let a stale offline check overwrite a successful chat", async () => {
    let resolve!: (value: any) => void;
    get.mockImplementationOnce(
      () =>
        new Promise(done => {
          resolve = done;
        })
    );
    const pending = checkOnesaHealth("Unavailable");
    post.mockResolvedValueOnce({ data: { reply: "I am Onesa." } });
    await sendOnesaChatMessage(input);
    resolve({ data: { ready: false } });
    expect((await pending).online).toBe(true);
    expect((await checkOnesaHealth("Unavailable")).online).toBe(true);
  });
});

describe("trip request cancellation", () => {
  it("passes the caller's cancellation signal and generation timeout", async () => {
    const request = new AbortController();
    post.mockResolvedValueOnce({ data: { plan: {} } });
    await requestOnesaTripPlan(
      { days: 3 },
      { signal: request.signal, timeout: 240000 }
    );
    expect(post).toHaveBeenCalledWith(
      "/ai/trip-plan",
      { days: 3 },
      { signal: request.signal, timeout: 240000 }
    );
  });
});

it("retries cached offline status immediately after reconnect without discarding a healthy result", async () => {
  get
    .mockResolvedValueOnce({ data: { ready: false } })
    .mockResolvedValueOnce({ data: { ready: true } });
  expect((await checkOnesaHealth("Offline")).online).toBe(false);
  invalidateOfflineOnesaHealth();
  expect((await checkOnesaHealth("Offline")).online).toBe(true);
  invalidateOfflineOnesaHealth();
  expect((await checkOnesaHealth("Offline")).online).toBe(true);
  expect(get).toHaveBeenCalledTimes(2);
});
