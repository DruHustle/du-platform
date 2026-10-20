import { describe, expect, it } from "vitest";
import { mergeReplyContinuation, removeRepeatedReplyText } from "./replyText";

describe("Onesa reply text", () => {
  const introduction =
    "For German citizens seeking a tourist visa, the current information from the Zimbabwean Department of Immigration and the German Embassy indicates that";
  const requirement = "A valid passport with at least six";

  it("removes the restarted paragraph shown in the screenshot and preserves bold text", () => {
    const complete = `**${introduction} visa on arrival is the standard procedure.**`;
    expect(removeRepeatedReplyText(`${introduction}\n${complete}`)).toBe(
      complete
    );
  });

  it("removes the restarted passport bullet shown in the screenshot", () => {
    const complete = `* ${requirement} months of validity remaining from your date of entry and at least two blank pages for the visa stamp.`;
    expect(
      removeRepeatedReplyText(
        `* Requirements:\n\n- ${requirement}\n${complete}`
      )
    ).toBe(`* Requirements:\n\n${complete}`);
  });

  it("handles adjacent repeated paragraphs and more than two copies", () => {
    const paragraph =
      "Please bring your passport and supporting documents to the immigration counter.";
    expect(
      removeRepeatedReplyText(`${paragraph}\n\n${paragraph}\n\n${paragraph}`)
    ).toBe(paragraph);
  });

  it("preserves the surrounding paragraphs and unique information", () => {
    const complete = `${introduction} visa on arrival may be available.`;
    expect(
      removeRepeatedReplyText(
        `Before travelling:\n\n${introduction} ${complete}\n\nCheck the latest requirements.`
      )
    ).toBe(
      `Before travelling:\n\n${complete}\n\nCheck the latest requirements.`
    );
  });

  it("preserves repeated values in structured trip-plan JSON", () => {
    const json = JSON.stringify({
      itinerary: [
        {
          details:
            "Bring your passport and supporting documents to the counter.",
        },
        {
          details:
            "Bring your passport and supporting documents to the counter.",
        },
      ],
    });
    expect(removeRepeatedReplyText(json)).toBe(json);
  });

  it.each([
    "Very, very helpful. Thank you, thank you!",
    "- Bring a valid passport with at least six months remaining.\n- Bring a valid passport with at least two blank pages.",
    "Bring your passport and supporting documents to the counter.\n\nPayment is made at the desk.\n\nBring your passport and supporting documents to the counter.",
    "```text\nA valid passport with at least six\nA valid passport with at least six\n```",
    "~~~text\nA valid passport with at least six\nA valid passport with at least six\n~~~",
    "`A valid passport with at least six A valid passport with at least six`",
    "    A valid passport with at least six A valid passport with at least six",
    "| A valid passport with at least six | A valid passport with at least six |",
  ])("preserves intentional or distinct content: %s", reply => {
    expect(removeRepeatedReplyText(reply)).toBe(reply);
  });

  it("removes overlap at a continuation boundary even if Markdown changes", () => {
    expect(
      mergeReplyContinuation(
        `Before travelling:\n\n${introduction}`,
        `**${introduction} check the requirements.**`
      )
    ).toBe(`Before travelling:\n\n**${introduction} check the requirements.**`);
  });

  it("does not duplicate an answer when the continuation restarts the entire reply", () => {
    const reply =
      "Bring your passport and supporting documents to the counter.";
    expect(mergeReplyContinuation(reply, `${reply}\n\nThen pay the fee.`)).toBe(
      `${reply}\n\nThen pay the fee.`
    );
    expect(mergeReplyContinuation(reply, reply)).toBe(reply);
  });

  it("merges a shorter overlap without losing the preceding sentence", () => {
    expect(
      mergeReplyContinuation(
        "At the counter, bring your passport and supporting documents",
        "your passport and supporting documents for review."
      )
    ).toBe(
      "At the counter, bring your passport and supporting documents for review."
    );
  });

  it("preserves list formatting when a continuation starts a new list item", () => {
    expect(
      mergeReplyContinuation(
        "- Bring a passport.",
        "- Bring proof of accommodation."
      )
    ).toBe("- Bring a passport.\n\n- Bring proof of accommodation.");
  });

  it("appends a continuation with no overlap without dropping words", () => {
    expect(
      mergeReplyContinuation(
        "You may be asked to",
        "show proof of accommodation."
      )
    ).toBe("You may be asked to show proof of accommodation.");
  });
});
