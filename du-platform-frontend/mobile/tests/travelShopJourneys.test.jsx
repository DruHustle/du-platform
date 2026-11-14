import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TravelScreen } from "../src/screens/Travel";
import { ProductScreen, ShopScreen } from "../src/screens/Shop";

const fakes = vi.hoisted(() => ({
  platform: { OS: "ios" }, open: vi.fn(), request: vi.fn(), navigate: vi.fn(),
}));
vi.mock("react-native", () => ({
  Platform: fakes.platform, Linking: { openURL: fakes.open }, StyleSheet: { create: x => x },
  Keyboard: { dismiss: vi.fn() }, Text: "Text", View: "View", Image: "Image", Pressable: "Pressable", Switch: "Switch",
}));
vi.mock("expo-web-browser", () => ({ openBrowserAsync: fakes.open }));
vi.mock("expo-secure-store", () => ({ getItemAsync: async () => null }));
vi.mock("expo-crypto", () => ({}));
vi.mock("@react-navigation/native", async () => ({
  useFocusEffect: callback => React.useEffect(callback, [callback]),
  useNavigation: () => ({ navigate: fakes.navigate, setParams: vi.fn() }),
}));
vi.mock("../src/api", () => ({ request: fakes.request, ApiError: class extends Error {} }));
vi.mock("../src/media", () => ({ productImageUrl: () => undefined }));
vi.mock("../src/session", () => ({ useSession: () => ({ user: null }), ORDER_KEY: "order", PENDING_ORDER_KEY: "pending", PENDING_ORDER_COMMAND_KEY: "command" }));
vi.mock("../src/cart", () => ({ useCart: () => ({ items: [] }) }));
vi.mock("../src/ui", () => ({
  Action: "Action", Card: "Card", Copy: "Copy", Field: "Field", Heading: "Heading",
  Loading: "Loading", Message: "Message", Screen: "Screen", colors: {},
}));

let view;
const render = async element => { await act(async () => { view = create(element); }); };
const action = title => view.root.findAllByType("Action").find(n => n.props.title === title || n.props.accessibilityLabel === title);
const press = async title => {
  const button = action(title);
  expect(button, title).toBeDefined();
  await act(async () => button.props.onPress());
};
const enter = async (label, value) => {
  const field = view.root.findAllByType("Field").find(n => n.props.label === label);
  expect(field, label).toBeDefined();
  await act(async () => field.props.onChangeText(value));
};
const originalActSetting = globalThis.IS_REACT_ACT_ENVIRONMENT;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; vi.clearAllMocks(); });
afterEach(async () => {
  if (view) await act(async () => view.unmount());
  view = undefined;
  globalThis.IS_REACT_ACT_ENVIRONMENT = originalActSetting;
});

describe.each(["ios", "android"])("%s public Travel and Shop screens", platform => {
  it.each(["flights", "stays"])("carries the visitor's %s criteria to the named provider", async category => {
    fakes.platform.OS = platform;
    const flight = category === "flights";
    const provider = flight ? "Kiwi.com" : "Pilot";
    const quote = {
      category, provider, id: "test-option", identity: "same-test-option", title: "Test option",
      currency: "EUR", price: 120, reviewAfter: new Date(Date.now() + 60_000).toISOString(),
      bookingUrl: flight ? "https://www.kiwi.com/u/testflight" : "https://pilotplans.com/stays/testhotel",
    };
    fakes.request.mockImplementation(async path => {
      if (path === "/travel/capabilities") return { locations: [{ id: "FRA", name: "Frankfurt", country: "DE" }, { id: "HRE", name: "Harare", country: "ZW" }] };
      if (path === "/travel/search") return { quotes: [quote] };
      if (path.startsWith("/travel/revalidate")) return { quote, changed: false, referralAvailable: true };
      throw new Error("Unexpected request " + path);
    });
    await render(<TravelScreen route={{ params: { section: category } }}/>);
    if (!flight) {
      await enter("Guest nationality (two-letter country code)", "ZW");
      await press("Edit travellers and currency");
      await press("Add an adult");
      await press("Add a child");
      await enter("Child 1 age (0–17)", "7");
    }
    await press(`Search ${provider}`);
    const submitted = fakes.request.mock.calls.find(([path]) => path === "/travel/search")[1].body;
    expect(submitted).toMatchObject({ category, criteria: { destination: "HRE", ...(flight ? { origin: "FRA" } : { adults: 2, childAges: [7], rooms: 1, guestNationality: "ZW" }) } });
    await press("Check current provider details");
    expect(Boolean(action("Continue to Kiwi.com with referral tracking"))).toBe(flight && platform === "android");
    await press(`Continue to ${provider}`);
    expect(fakes.open).toHaveBeenCalledWith(quote.bookingUrl);
  });

  it("opens a closed product, validates email and requests a single product alert", async () => {
    fakes.platform.OS = platform;
    const product = { id: 9, slug: "test-cordial", category: "food", name: "Test cordial", description: "Orange", currency: "EUR", price_cents: 100, stock_qty: 5, image_url: "" };
    fakes.request.mockImplementation(async path => {
      if (path === "/shop/products") return { products: [product], source: "db", readiness: { mode: "prelaunch", enforcement: "enforced", commercialReady: false, destinationCountries: [], approvedProductIds: [] } };
      if (path === "/shop/products/9/details") return { details: {} };
      if (path === "/shop/restock-notifications") return { requiresConfirmation: true };
      throw new Error("Unexpected request " + path);
    });
    await render(<ShopScreen/>);
    expect(action("Basket (0)")).toBeUndefined();
    await press("Product details");
    const [screen, params] = fakes.navigate.mock.lastCall;
    expect(screen).toBe("Product");
    await act(async () => view.update(<ProductScreen route={{ params }}/>));
    expect(action("Add to basket")).toBeUndefined();
    await press("Email me when available");
    expect(view.root.findAllByType("Message").some(n => n.props.message === "Enter a valid email address.")).toBe(true);
    await enter("Email address", "native@example.test");
    await press("Email me when available");
    expect(fakes.request).toHaveBeenCalledWith("/shop/restock-notifications", expect.objectContaining({ method: "POST", body: expect.objectContaining({ productId: 9, email: "native@example.test" }) }));
    expect(view.root.findAllByType("Message").some(n => n.props.message.includes("Check your inbox"))).toBe(true);
  });
});
