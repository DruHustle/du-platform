import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantScreen, ContactScreen } from "../src/screens/Help";

const fakes = vi.hoisted(() => ({
  platform: { OS: "ios" }, navigate: vi.fn(), reply: vi.fn(),
  request: vi.fn(), restore: vi.fn(), save: vi.fn(), remove: vi.fn(),
}));
vi.mock("react-native", () => ({
  Platform: fakes.platform, StyleSheet: { create: value => value }, Linking: {},
  View: "View", Text: "Text", TextInput: "TextInput", Pressable: "Pressable",
  ActivityIndicator: "ActivityIndicator", ScrollView: "ScrollView", KeyboardAvoidingView: "KeyboardAvoidingView",
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
vi.mock("expo-web-browser", () => ({ openBrowserAsync: vi.fn() }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "report-request" }));
vi.mock("@react-navigation/native", () => ({ useNavigation: () => ({ navigate: fakes.navigate }) }));
vi.mock("../src/api", () => ({ ApiError: class extends Error {}, request: fakes.request, requestOnesaReply: fakes.reply }));
vi.mock("../src/securePayload", () => ({
  readSecurePayload: fakes.restore, saveSecurePayload: fakes.save, deleteSecurePayload: fakes.remove,
}));
vi.mock("../src/session", () => ({ PENDING_CONTACT_KEY: "pending-contact" }));

describe.each(["ios", "android"])("Onesa on %s", platform => {
  let screen, initialAct;
  beforeEach(() => {
    vi.resetAllMocks();
    initialAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    fakes.platform.OS = platform;
    fakes.restore.mockResolvedValue(null);
  });
  afterEach(async () => {
    if (screen) await act(async () => screen.unmount());
    screen = undefined;
    globalThis.IS_REACT_ACT_ENVIRONMENT = initialAct;
  });
  async function render(element) {
    await act(async () => { screen = create(element); });
    const keyboard = screen.root.findByType("KeyboardAvoidingView");
    expect(keyboard.props.behavior).toBe(platform === "ios" ? "padding" : undefined);
  }
  function buttons(title) {
    return screen.root.findAllByType("Pressable").filter(b => b.findByType("Text").props.children === title);
  }
  function field(label) { return screen.root.findByProps({ accessibilityLabel: label }); }
  async function press(title, index = 0) {
    const button = buttons(title)[index];
    expect(button.props.disabled).toBe(false);
    await act(async () => button.props.onPress());
  }
  async function enter(label, value) { await act(async () => field(label).props.onChangeText(value)); }

  it("requires explicit permission, preserves drafts and can report only the selected reply", async () => {
    await render(<AssistantScreen />);
    const copy = screen.root.findAllByType("Text").map(t => t.props.children).filter(t => typeof t === "string").join(" ");
    for (const provider of ["Google Gemini", "Groq", "Anthropic", "Cerebras"]) expect(copy).toContain(provider);
    await enter("Your message", "private draft");
    expect(buttons("Send message")[0].props.disabled).toBe(true);
    await press("Keep my draft private");
    expect(field("Your message").props.value).toBe("private draft");
    await press("Review chat sharing"); await press("Allow sharing for this chat");
    expect(fakes.reply).not.toHaveBeenCalled();
    fakes.reply.mockResolvedValueOnce("First reply").mockResolvedValueOnce("Reply to report");
    await press("Send message");
    await enter("Your message", "second message"); await press("Send message");
    expect(fakes.reply.mock.calls[1][0]).toHaveLength(3);
    await press("Report this reply", 1);
    expect(fakes.navigate).toHaveBeenCalledWith("Contact", { reportReply: "Reply to report" });
    expect(fakes.request).not.toHaveBeenCalled();

    let resolveOld;
    fakes.reply.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    await enter("Your message", "interrupted draft"); await press("Send message");
    const signal = fakes.reply.mock.calls.at(-1)[1];
    await press("Revoke chat sharing");
    expect(signal.aborted).toBe(true);
    await act(async () => resolveOld("Arrived after revocation"));
    expect(field("Your message").props.value).toBe("interrupted draft");
    expect(buttons("Send message")[0].props.disabled).toBe(true);
    expect(buttons("Report this reply")).toHaveLength(2);
  });

  it("lets the user select, edit and send a reply report without overwriting pending support", async () => {
    const pending = { name: "Guest", email: "guest@example.test", subject: "Earlier help",
      message: "Keep this pending message", language: "en", module: "general", requestId: "earlier-request" };
    fakes.restore.mockResolvedValueOnce(JSON.stringify(pending));
    fakes.request.mockImplementation(async (_, { body }) => ({ received: true, requestId: body.requestId }));
    await render(<ContactScreen route={{ params: { reportReply: "Reply to report" } }} />);
    expect(field("Message").props.value).toBe(pending.message);
    expect(buttons("Use selected reply in report")[0].props.disabled).toBe(true);
    expect(fakes.request).not.toHaveBeenCalled();
    await press("Retry same message");
    expect(fakes.request.mock.calls[0][1].body).toEqual(pending);
    await enter("Subject", "Other draft");
    expect(buttons("Use selected reply in report")[0].props.disabled).toBe(true);
    await enter("Subject", "");
    await press("Use selected reply in report");
    expect(field("Message").props.value).toBe("Reply to report");
    expect(fakes.request).toHaveBeenCalledTimes(1);
    await enter("Full name", "Guest"); await enter("Email address", "guest@example.test");
    await enter("Message", "Only the detail I choose");
    await press("Send message");
    expect(fakes.request).toHaveBeenLastCalledWith("/notifications/contact", expect.objectContaining({
      body: expect.objectContaining({ subject: "Report an Onesa reply", message: "Only the detail I choose", requestId: "report-request" }),
    }));
  });
});
