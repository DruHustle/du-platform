import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, parseCatalog, request, requestOnesaReply, validateApiUrl, type ChatMessage } from "../src/api";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("mobile API boundary", () => {
  it("requires HTTPS except for explicit local development origins", () => {
    expect(validateApiUrl("https://www.diasporaunlocked.com/api/")).toBe("https://www.diasporaunlocked.com/api");
    expect(validateApiUrl("http://10.0.2.2:5001/api")).toBe("http://10.0.2.2:5001/api");
    for (const value of ["http://example.com/api", "https://user:pass@example.com/api", "https://example.com/api?token=x", "not a url"]) expect(() => validateApiUrl(value)).toThrow();
  });
  it("unwraps successful envelopes and sends an explicit bearer credential", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({success:true,data:{value:1}}), {status:200}));
    vi.stubGlobal("fetch",fetchMock);
    expect(await request("/test",{method:"POST",body:{name:"test"},token:"opaque"})).toEqual({value:1});
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer opaque");
  });
  it("distinguishes authorization, rate limits and network failure", async () => {
    for (const status of [401,429,503]) {
      vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{code:"TEST",message:"Retry later"}}),{status})));
      await expect(request("/test")).rejects.toMatchObject({status,code:"TEST",message:"Retry later"});
    }
    vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("offline")));
    await expect(request("/test")).rejects.toBeInstanceOf(ApiError);
    await expect(request("/test")).rejects.toMatchObject({status:0,code:"NETWORK_ERROR"});
  });
  it("sends the latest 20 Onesa messages while retaining the complete conversation", async () => {
    const conversation: ChatMessage[] = Array.from({ length: 23 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant", content: `Message ${i}`,
    }));
    const post = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { reply: "Ready" } })));
    vi.stubGlobal("fetch", post);
    await expect(requestOnesaReply(conversation, new AbortController().signal)).resolves.toBe("Ready");
    expect(JSON.parse(post.mock.calls[0][1].body).messages).toEqual(conversation.slice(3));
    expect(conversation).toHaveLength(23);
  });
  it("times out a stalled response body after headers arrive", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url, { signal }) => ({
      ok: true, status: 200,
      json: () => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))),
    })));
    await expect(request("/test", { timeoutMs: 20 })).rejects.toMatchObject({ status: 0, message: "The request timed out. Please try again." });
  });
  it("accepts a successful no-content action and rejects a failed JSON envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: { code: "UNCONFIRMED", message: "Try again" } }))));
    await expect(request("/test")).resolves.toBeNull();
    await expect(request("/test")).rejects.toMatchObject({ code: "UNCONFIRMED", message: "Try again" });
  });
  it("does not interpret an HTML success page as a completed API operation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Unavailable</html>")));
    await expect(request("/test")).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it("does not accept an absolute URL as an API path", async () => {
    await expect(request("//evil.test/path")).rejects.toThrow("Invalid API path");
    await expect(request("/../private")).rejects.toThrow("Invalid API path");
  });
  it("rejects malformed successful API responses with a retryable error", async () => {
    for (const body of ["<html>upstream unavailable</html>", "", "null", "false", '{"success":true}', '{"success":true,"data":null}']) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
      await expect(request("/test")).rejects.toMatchObject({ code: "INVALID_RESPONSE", status: 502 });
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"success":false,"error":{"message":"Rejected","code":"REJECTED"}}', { status: 200 })));
    await expect(request("/test")).rejects.toMatchObject({ code: "REJECTED", message: "Rejected" });
  });
  it("preserves an authentication error even when an intermediary returns HTML", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Unauthorized</html>", { status: 401 })));
    await expect(request("/test")).rejects.toMatchObject({ status: 401, code: "API_ERROR" });
  });
  it("keeps the deadline active while reading a response body after headers arrived", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => Promise.resolve(new Response(new ReadableStream({
      start(controller) { init.signal!.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError")), { once: true }); },
    }), { status: 200 }))));
    const outcome = request("/test", { timeoutMs: 25 }).catch(error => error);
    await vi.advanceTimersByTimeAsync(25);
    expect(await outcome).toMatchObject({ message: "The request timed out. Please try again.", code: "NETWORK_ERROR" });
  });
  it("still cancels a body read when the caller changes a Travel form", async () => {
    const caller = new AbortController();
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => Promise.resolve(new Response(new ReadableStream({
      start(controller) { init.signal!.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError")), { once: true }); },
    }), { status: 200 }))));
    const outcome = request("/test", { signal: caller.signal }).catch(error => error);
    await Promise.resolve();
    caller.abort();
    expect(await outcome).toMatchObject({ name: "AbortError" });
  });
});

describe("native catalogue responses", () => {
  const catalog = () => ({
    source: "db", cached: false,
    readiness: { commercialReady: true, mode: "pilot", enforcement: "enforced", approvedProductIds: [1], destinationCountries: ["DE"] },
    products: [{ id: 1, slug: "woven-basket", name: "Woven basket", description: "Handwoven", category: "crafts", image_url: "/images/basket.webp", image_api_url: null, price_cents: 1500, currency: "EUR", stock_qty: 3, is_active: 1 }],
  });

  it("accepts live and sample catalogues, including an empty catalogue", () => {
    const live = catalog();
    expect(parseCatalog(live)).toEqual(live);
    expect(parseCatalog({ ...live, source: "memory", products: [], readiness: { ...live.readiness, commercialReady: false, approvedProductIds: [] } }).products).toEqual([]);
  });

  it.each([
    null,
    { name: null },
    { description: 7 },
    { price_cents: "1500" },
    { price_cents: -1 },
    { stock_qty: 1.5 },
    { image_api_url: {} },
  ])("rejects malformed rows before native filtering or price rendering: %j", changes => {
    const data = catalog();
    const invalidRow = changes === null ? null : { ...data.products[0], ...changes };
    expect(() => parseCatalog({ ...data, products: [invalidRow] })).toThrow(ApiError);
  });

  it("does not interpret malformed commercial readiness as ordering permission", () => {
    const data = catalog();
    for (const readiness of [undefined, { ...data.readiness, commercialReady: "false" }, { ...data.readiness, approvedProductIds: ["1"] }]) {
      expect(() => parseCatalog({ ...data, readiness })).toThrow("catalogue response was invalid");
    }
  });
});
