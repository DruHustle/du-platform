import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationService } from "../services/notificationService";
import { randomUUID } from "node:crypto";

describe("durable notification boundary", () => {
  const repository = {
    findUserById: vi.fn(async () => ({ id: 1, email: "fixture@example.test" })),
    createFeatureNotification: vi.fn(),
    createContactInquiry: vi.fn(),
  };
  const service = new NotificationService(repository as any);
  const contact = {
    requestId: randomUUID(),
    name: "Fixture",
    email: "FIXTURE@example.test",
    subject: "Question",
    message: "Synthetic message",
    language: "de",
  };
  beforeEach(() => {
    vi.clearAllMocks();
    repository.createContactInquiry.mockResolvedValue({
      received: true,
      requestId: contact.requestId,
    });
    repository.createFeatureNotification.mockResolvedValue({ created: true });
  });
  it("returns a durable receipt rather than claiming provider delivery", async () => {
    expect(await service.createContactInquiry(contact)).toEqual({
      received: true,
      requestId: contact.requestId,
    });
    expect(repository.createContactInquiry).toHaveBeenCalledWith({
      ...contact,
      email: "fixture@example.test",
      phone: "",
      module: "general",
    });
  });
  it("does not claim success when durable storage fails", async () => {
    repository.createContactInquiry.mockRejectedValueOnce(
      new Error("Synthetic storage failure")
    );
    await expect(service.createContactInquiry(contact)).rejects.toThrow(
      "Synthetic storage failure"
    );
  });
  it("rejects oversized input before persistence", async () => {
    await expect(
      service.createContactInquiry({ ...contact, message: "x".repeat(4001) })
    ).rejects.toThrow();
    expect(repository.createContactInquiry).not.toHaveBeenCalled();
  });
  it("passes one bounded feature request to durable persistence", async () => {
    await service.createFeatureNotification(1, "  synthetic_feature  ");
    expect(repository.createFeatureNotification).toHaveBeenCalledWith(
      1,
      "fixture@example.test",
      "synthetic_feature"
    );
  });
  it("does not store an unbounded feature or an unknown account", async () => {
    await expect(
      service.createFeatureNotification(1, "x".repeat(121))
    ).rejects.toMatchObject({ status: 400 });
    repository.findUserById.mockResolvedValueOnce(null as any);
    await expect(
      service.createFeatureNotification(1, "feature")
    ).rejects.toMatchObject({ status: 401 });
    expect(repository.createFeatureNotification).not.toHaveBeenCalled();
  });
});
