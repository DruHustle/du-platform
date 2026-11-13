import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request, requestOnesaReply, validateApiUrl, type ChatMessage } from "../src/api";

afterEach(() => vi.unstubAllGlobals());
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
  it("does not interpret an HTML success page as a completed API operation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Unavailable</html>")));
    await expect(request("/test")).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it("does not accept an absolute URL as an API path", async () => {
    await expect(request("//evil.test/path")).rejects.toThrow("Invalid API path");
    await expect(request("/../private")).rejects.toThrow("Invalid API path");
  });
});
