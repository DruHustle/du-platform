import React from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { AccountScreen } from "../src/screens/Account";

const { session } = vi.hoisted(() => ({
  session: { user: null, register: vi.fn(), signOut: vi.fn() },
}));
vi.mock("../src/session", () => ({ useSession: () => session }));
vi.mock("@react-navigation/native", () => ({ useNavigation: () => ({}) }));
vi.mock("../src/ui", () => ({
  Action: "Action", Card: "Card", Copy: "Copy", Field: "Field",
  Heading: "Heading", Loading: "Loading", Message: "Message", Screen: "Screen",
}));

it("returns a newly registered member to sign-in after signing out", async () => {
  const before = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let view;
  try {
    session.register.mockImplementationOnce(async (fullName, email) => {
      session.user = { id: 12, fullName, email };
    });
    session.signOut.mockImplementationOnce(async () => { session.user = null; });
    await act(async () => { view = create(<AccountScreen />); });
    const button = title => view.root.findAllByType("Action").find(n => n.props.title === title);
    async function press(title) { await act(async () => button(title).props.onPress()); }
    async function enter(label, value) {
      const field = view.root.findAllByType("Field").find(n => n.props.label === label);
      await act(async () => field.props.onChangeText(value));
    }
    await press("Create an account");
    await enter("Full name", "Test Member");
    await enter("Email address", "member@example.test");
    await enter("Password", "fixture-only");
    await press("Create account");
    await press("Sign out");
    await act(async () => view.update(<AccountScreen />));
    expect(button("Sign in")).toBeDefined();
    expect(button("Create account")).toBeUndefined();
    expect(view.root.findAllByType("Field").find(n => n.props.label === "Password").props.value).toBe("");
  } finally {
    if (view) await act(async () => view.unmount());
    session.user = null;
    globalThis.IS_REACT_ACT_ENVIRONMENT = before;
  }
});
