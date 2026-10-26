import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  sendEmailMessage,
  sendEmailMessageSafe,
  sendResetEmail,
} from "../../../shared/email";
import { sendNewsletterEmail } from "../../newsletter/provider";

const { axiosPost } = vi.hoisted(() => ({
  axiosPost: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    post: axiosPost,
  },
}));

describe("sendResetEmail", () => {
  const originalResetEmailProvider = process.env.RESET_EMAIL_PROVIDER;
  const originalResendApiKey = process.env.RESEND_API_KEY;
  const originalFromEmail = process.env.FROM_EMAIL;

  beforeEach(() => {
    axiosPost.mockReset();
    axiosPost.mockResolvedValue({ data: { id: "synthetic-message" } });
    process.env.RESET_EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.FROM_EMAIL = "no-reply@example.com";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    if (originalResetEmailProvider === undefined)
      delete process.env.RESET_EMAIL_PROVIDER;
    else process.env.RESET_EMAIL_PROVIDER = originalResetEmailProvider;

    if (originalResendApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalResendApiKey;

    if (originalFromEmail === undefined) delete process.env.FROM_EMAIL;
    else process.env.FROM_EMAIL = originalFromEmail;
  });

  it.each(["RECOVERY_MODE", "OUTBOUND_MESSAGES_PAUSED"])(
    "blocks every email provider entry point when %s is set",
    async flag => {
      vi.stubEnv(flag, "true");
      await expect(
        sendResetEmail("user@example.test", "https://example.test/reset")
      ).rejects.toThrow("paused");
      await expect(
        sendNewsletterEmail(
          {
            from: "sender@example.test",
            to: "user@example.test",
            subject: "Fixture",
            text: "Fixture",
            html: "Fixture",
          },
          "synthetic-key"
        )
      ).rejects.toThrow("paused");
      expect(axiosPost).not.toHaveBeenCalled();
    }
  );

  it("does not claim acceptance without provider configuration or an acknowledgement", async () => {
    const payload = {
      to: "user@example.test",
      subject: "Fixture",
      text: "Fixture",
    };
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(sendEmailMessage(payload)).rejects.toThrow("not configured");
    vi.stubEnv("RESEND_API_KEY", "synthetic");
    axiosPost.mockResolvedValueOnce({ data: {} });
    await expect(sendEmailMessage(payload)).rejects.toThrow(
      "confirm acceptance"
    );
    vi.stubEnv("RESET_EMAIL_PROVIDER", "unsupported");
    await expect(sendEmailMessage(payload)).rejects.toThrow("not supported");
  });

  it("keeps private message content and provider credentials out of failure logs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    axiosPost.mockRejectedValueOnce(
      new Error("private-api-key private-address@example.test private-body")
    );
    await expect(
      sendEmailMessageSafe(
        {
          to: "private-address@example.test",
          subject: "private-subject",
          text: "private-body",
        },
        "test-fixture"
      )
    ).resolves.toBe(false);
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/private-/);
  });

  it("strips line breaks from user-controlled subject headers", async () => {
    await sendEmailMessage({
      to: "user@example.com",
      subject: "Question\r\nBcc: attacker@example.com",
      text: "Test",
    });
    expect(axiosPost.mock.calls[0][1].subject).toBe(
      "Question  Bcc: attacker@example.com"
    );
  });

  it("escapes reset URLs before embedding them in email HTML", async () => {
    const resetUrl =
      'https://du.example/reset?next="><script>alert(1)</script>';

    await sendResetEmail("user@example.com", resetUrl);

    expect(axios.post).toBe(axiosPost);
    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(axiosPost).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        html: expect.stringContaining(
          'href="https://du.example/reset?next=&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"'
        ),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      })
    );
    expect(axiosPost.mock.calls[0]?.[1]?.html).not.toContain(resetUrl);
  });
});
