import { afterEach, describe, expect, it, vi } from "vitest";
import { readContactAttempt, sendContactAttempt } from "../src/contact";

afterEach(() => vi.unstubAllGlobals());

describe("contact message recovery", () => {
  const saved = {
    name: "Example user", email: "user@example.test", subject: "Delivery question", message: "Can I collect in Harare?",
    module: "general", language: "en", requestId: "d391b6b9-0fed-45dc-9922-0ca663efb9b2",
  };
  const reply = (data: unknown) => new Response(JSON.stringify({ success: true, data }));
  it("accepts a matching receipt on replay after a response was lost", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("Connection interrupted"))
      .mockResolvedValueOnce(reply({ received: true, requestId: saved.requestId }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendContactAttempt(saved)).rejects.toThrow();
    const restored = readContactAttempt(JSON.stringify(saved));
    await expect(sendContactAttempt(restored)).resolves.toBe(saved.requestId);
    expect(fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body))).toEqual([saved, saved]);
  });
  it.each([null, {}, { received: true, requestId: "another-message" }, { received: false, requestId: saved.requestId }])(
    "keeps a request unconfirmed after an unrelated or incomplete response", async data => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(data)));
      await expect(sendContactAttempt(saved)).rejects.toThrow("did not confirm");
    }
  );
  it("does not replay incomplete stored messages", () => {
    expect(() => readContactAttempt(JSON.stringify({ ...saved, requestId: "" }))).toThrow();
    expect(() => readContactAttempt("{")).toThrow();
  });
});
