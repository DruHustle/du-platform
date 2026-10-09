import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { appendFile, mkdir, getNotifyAlertEmails, getNotifyFromEmail, sendEmailMessageSafe } = vi.hoisted(() => ({
  appendFile: vi.fn(),
  mkdir: vi.fn(),
  getNotifyAlertEmails: vi.fn(),
  getNotifyFromEmail: vi.fn(),
  sendEmailMessageSafe: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  default: {
    appendFile,
    mkdir,
  },
}));

vi.mock("../../../shared/databaseRuntime", () => ({
  db: null,
}));

vi.mock("../../../shared/email", () => ({
  getNotifyAlertEmails,
  getNotifyFromEmail,
  sendEmailMessageSafe,
}));

import { appendFintechRecoveryRecord } from "../services/fintechRecoveryQueue";

describe("appendFintechRecoveryRecord", () => {
  const originalRecoveryDir = process.env.FINTECH_RECOVERY_DIR;

  beforeEach(() => {
    appendFile.mockReset().mockResolvedValue(undefined);
    mkdir.mockReset().mockResolvedValue(undefined);
    getNotifyAlertEmails.mockReset().mockResolvedValue([]);
    getNotifyFromEmail.mockReset().mockResolvedValue("alerts@example.com");
    sendEmailMessageSafe.mockReset().mockResolvedValue(true);
    process.env.FINTECH_RECOVERY_DIR = "/tmp/du-platform-fintech-recovery";
  });

  afterEach(() => {
    if (originalRecoveryDir === undefined) delete process.env.FINTECH_RECOVERY_DIR;
    else process.env.FINTECH_RECOVERY_DIR = originalRecoveryDir;
  });

  it("uses FINTECH_RECOVERY_DIR for local fallback storage", async () => {
    await appendFintechRecoveryRecord({
      flow: "airtime",
      provider: "Reloadly",
      userId: 7,
      idempotencyKey: "d818fd6b-fcd0-4a5f-badb-d278fca8d8cb",
      providerReference: "reloadly-123",
      status: "completed",
      amount: 10,
      currency: "USD",
      recordedAt: "2026-03-28T12:00:00.000Z",
      reason: "database unavailable",
    });

    const expectedBaseDir = path.resolve("/tmp/du-platform-fintech-recovery");
    expect(mkdir).toHaveBeenCalledWith(expectedBaseDir, { recursive: true });
    expect(appendFile).toHaveBeenCalledWith(
      path.join(expectedBaseDir, "airtime.jsonl"),
      expect.stringContaining('"flow":"airtime"'),
      "utf8"
    );
    expect(getNotifyAlertEmails).toHaveBeenCalledTimes(1);
  });
});
