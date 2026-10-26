import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../../../shared/email", async importOriginal => ({
  ...(await importOriginal<typeof import("../../../shared/email")>()),
  getNotifyFromEmail: vi.fn(async () => "support@example.com"),
  getNotifyAlertEmails: vi.fn(async () => ["admin@example.com"]),
  sendEmailMessageSafe: vi.fn(async () => true),
}));
import {
  getNotifyAlertEmails,
  sendEmailMessageSafe,
} from "../../../shared/email";
import { NotificationService } from "../services/notificationService";

describe("notification HTML", () => {
  beforeEach(() => {
    vi.mocked(sendEmailMessageSafe).mockReset().mockResolvedValue(true);
    vi.mocked(getNotifyAlertEmails).mockResolvedValue(["admin@example.com"]);
  });

  const contact = {
    name: "Fixture",
    email: "fixture@example.test",
    subject: "Question",
    message: "Synthetic message",
  };
  it("rejects undelivered contact enquiries without sending a false customer acknowledgement", async () => {
    vi.mocked(sendEmailMessageSafe).mockResolvedValueOnce(false);
    await expect(
      new NotificationService().createContactInquiry(contact)
    ).rejects.toMatchObject({
      status: 503,
      code: "CONTACT_INQUIRY_UNAVAILABLE",
    });
    expect(sendEmailMessageSafe).toHaveBeenCalledOnce();
  });
  it("rejects contact enquiries when no operator destination exists", async () => {
    vi.mocked(getNotifyAlertEmails).mockResolvedValue([]);
    await expect(
      new NotificationService().createContactInquiry(contact)
    ).rejects.toMatchObject({ status: 503 });
    expect(sendEmailMessageSafe).not.toHaveBeenCalled();
  });
  it("retains successful operator acceptance when only the customer acknowledgement fails", async () => {
    vi.mocked(sendEmailMessageSafe)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    await expect(
      new NotificationService().createContactInquiry(contact)
    ).resolves.toHaveProperty("message");
    expect(sendEmailMessageSafe).toHaveBeenCalledTimes(2);
  });

  it("escapes contact fields while preserving message line breaks", async () => {
    const service = new NotificationService();
    await service.createContactInquiry({
      name: '<img src=x onerror="alert(1)">',
      email: "test@example.com",
      subject: "<strong>Offer</strong>",
      message: "<script>alert(1)</script>\nSecond line",
      phone: "<b>123</b>",
    });
    const bodies = vi
      .mocked(sendEmailMessageSafe)
      .mock.calls.map(([payload]) => payload.html || "");
    expect(bodies).toHaveLength(2);
    for (const html of bodies) {
      expect(html).not.toContain("<img");
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;img");
    }
    expect(bodies[0]).toContain(
      "&lt;script&gt;alert(1)&lt;/script&gt;<br>Second line"
    );
    expect(bodies[0]).toContain("&lt;b&gt;123&lt;/b&gt;");
  });

  it("escapes feature names in both user and admin email bodies", async () => {
    const repository = {
      findUserById: vi.fn(async () => ({ id: 1, email: "test@example.com" })),
      createFeatureNotification: vi.fn(async () => ({ created: true })),
    };
    const service = new NotificationService(repository as any);
    await service.createFeatureNotification(
      1,
      '<a href="https://evil.example">Click here</a>'
    );
    for (const [payload] of vi.mocked(sendEmailMessageSafe).mock.calls) {
      expect(payload.html).not.toContain('<a href="https://evil.example">');
      expect(payload.html).toContain("&lt;a href=");
    }
  });
});
