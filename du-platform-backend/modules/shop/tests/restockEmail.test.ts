import { afterEach, expect, it, vi } from "vitest";
const { post, rows } = vi.hoisted(() => ({ post: vi.fn(), rows: vi.fn() }));
vi.mock("axios", () => ({ default: { post } }));
vi.mock("../../../shared/persistence/settingsStore", () => ({
  getAdminSetting: vi.fn(async () => null),
}));
vi.mock("../../../shared/persistence/shopStore", () => ({
  getShopRestockNotificationsBySlug: rows,
}));
import { notifyRestockSubscribersAndAdmins } from "../../../shared/email";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
it("sends private alerts in each subscriber's saved language and survives one provider failure", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("RESET_EMAIL_PROVIDER", "resend");
  vi.stubEnv("RESEND_API_KEY", "fixture-no-network");
  vi.stubEnv("FROM_EMAIL", "shop@example.test");
  vi.stubEnv("ADMIN_EMAILS", "");
  vi.stubEnv("NOTIFY_ALERT_EMAILS", "");
  rows.mockResolvedValue([
    { email: "first@example.test", language: "de" },
    { email: "second@example.test", language: "sn" },
  ]);
  post
    .mockRejectedValueOnce(new Error("Fixture failure"))
    .mockResolvedValueOnce({ data: { id: "fixture" } });
  await notifyRestockSubscribersAndAdmins({
    productId: 1,
    productSlug: "fixture",
    productName: "<Test product>",
    stockQty: 2,
    updatedByEmail: "admin@example.test",
  });
  expect(post).toHaveBeenCalledTimes(2);
  const first = post.mock.calls[0][1],
    second = post.mock.calls[1][1];
  expect(first.to).toEqual(["first@example.test"]);
  expect(second.to).toEqual(["second@example.test"]);
  expect(first.subject).toContain("wieder verfügbar");
  expect(second.subject).toContain("zvadzoka");
  for (const message of [first, second]) {
    expect(message.html).not.toContain("<Test product>");
    expect(message.html).toContain("&lt;Test product&gt;");
  }
});
