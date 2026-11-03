import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request, validateApiUrl } from "../src/api";

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
