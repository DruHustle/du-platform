vi.mock("../src/onesaSignIn", () => ({loadOnesa: async () => ({enabled:false})}));
import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountScreen, ResetPasswordScreen } from "../src/screens/Account";
import { ApiError } from "../src/api";

const fakes = vi.hoisted(() => ({
  platform: { OS: "ios" },
  navigation: { setParams: vi.fn(), navigate: vi.fn(), popTo: vi.fn() },
  session: { user: null, signIn: vi.fn() },
  request: vi.fn(),
}));
vi.mock("react-native", () => ({
  Platform: fakes.platform, StyleSheet: { create: styles => styles },
  Text: "Text", TextInput: "TextInput", View: "View", Pressable: "Pressable",
  ActivityIndicator: "ActivityIndicator", ScrollView: "ScrollView", Keyboard: { metrics: () => undefined, addListener: () => ({ remove() {} }) },
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ bottom: 0 }) }));
vi.mock("@react-navigation/native", () => ({ useNavigation: () => fakes.navigation }));
vi.mock("../src/session", () => ({ useSession: () => fakes.session }));
vi.mock("../src/api", async importOriginal => ({ ...await importOriginal(), request: fakes.request }));

describe.each(["ios", "android"])("account recovery on %s", platform => {
  let view;
  let previousAct;
  beforeEach(() => {
    previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    fakes.platform.OS = platform;
    vi.resetAllMocks();
  });
  afterEach(async () => {
    if (view) await act(async () => view.unmount());
    view = undefined;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  });
  async function show(component) {
    await act(async () => { if (view) view.update(component); else view = create(component); });
  }
  function button(name) {
    return view.root.findAllByType("Pressable").find(n => n.props.children?.props.children === name);
  }
  async function press(name) {
    const b = button(name);
    expect(b, name).toBeDefined();
    await act(async () => b.props.onPress());
  }
  function input(label) {
    return view.root.findAllByType("TextInput").find(n => n.props.accessibilityLabel === label);
  }
  async function enter(label, value) {
    await act(async () => input(label).props.onChangeText(value));
  }

  it("recovers from a missing link, requests the same task and returns to the search after sign-in", async () => {
    const next = "/travel/stays";
    await show(<ResetPasswordScreen route={{ params: { next } }}/>);
    await press("Request a new reset link");
    expect(fakes.navigation.popTo).toHaveBeenCalledWith("Main", { screen: "Account", params: { entry: "forgot", next } });
    await show(<AccountScreen route={{ params: { entry: "forgot", next } }}/>);
    await enter("Email address", "traveller@example.test");
    await press("Send reset instructions");
    expect(fakes.request).toHaveBeenCalledWith("/auth/forgot-password", { method: "POST", body: { email: "traveller@example.test", language: "en", next } });
    await show(<ResetPasswordScreen route={{ params: { token: "fixture", next } }}/>);
    await enter("New password", "StrongFixture1!");
    await enter("Confirm new password", "StrongFixture1!");
    fakes.request.mockRejectedValueOnce(new ApiError("Connection interrupted."));
    await press("Reset password");
    expect(input("New password").props.value).toBe("StrongFixture1!");
    await press("Reset password");
    await press("Continue to sign in");
    expect(fakes.navigation.popTo).toHaveBeenLastCalledWith("Main", { screen: "Account", params: { entry: "login", next } });
    await show(<AccountScreen route={{ params: { entry: "login", next } }}/>);
    await enter("Email address", "traveller@example.test");
    await enter("Password", "StrongFixture1!");
    fakes.session.signIn.mockRejectedValueOnce(new ApiError("Connection interrupted."));
    await press("Sign in");
    expect(fakes.navigation.navigate).not.toHaveBeenCalled();
    expect(input("Password").props.value).toBe("StrongFixture1!");
    await press("Sign in");
    expect(fakes.navigation.navigate).toHaveBeenCalledWith("Travel", { section: "stays" });
  });

  it("replaces a consumed link and resets the form when a fresh link opens in the same screen", async () => {
    const next = "/travel/flights";
    await show(<ResetPasswordScreen route={{ params: { token: "expired", next } }}/>);
    await enter("New password", "StrongFixture1!");
    await enter("Confirm new password", "StrongFixture1!");
    fakes.request.mockRejectedValueOnce(new ApiError("Expired", 400, "AUTH_INVALID_RESET_TOKEN"));
    await press("Reset password");
    expect(input("New password")).toBeUndefined();
    await press("Request a new reset link");
    expect(fakes.navigation.popTo).toHaveBeenCalledWith("Main", { screen: "Account", params: { entry: "forgot", next } });
    await show(<ResetPasswordScreen route={{ params: { token: "fresh", next } }}/>);
    expect(input("New password").props.value).toBe("");
    expect(button("Reset password").props.disabled).toBe(true);
  });
});
