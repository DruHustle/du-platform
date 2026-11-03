import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../../shared/passwords";

describe("password helpers", () => {
  it("hashes and verifies a password with the configured scrypt settings", async () => {
    const password = "password123";
    const hash = await hashPassword(password);

    expect(hash).toContain(":");
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
