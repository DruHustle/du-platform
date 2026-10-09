import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendResetEmail } from "../../../shared/email";

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
    process.env.RESET_EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.FROM_EMAIL = "no-reply@example.com";
  });

  afterEach(() => {
    if (originalResetEmailProvider === undefined) delete process.env.RESET_EMAIL_PROVIDER;
    else process.env.RESET_EMAIL_PROVIDER = originalResetEmailProvider;

    if (originalResendApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalResendApiKey;

    if (originalFromEmail === undefined) delete process.env.FROM_EMAIL;
    else process.env.FROM_EMAIL = originalFromEmail;
  });

  it("escapes reset URLs before embedding them in email HTML", async () => {
    const resetUrl = 'https://du.example/reset?next="><script>alert(1)</script>';

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
