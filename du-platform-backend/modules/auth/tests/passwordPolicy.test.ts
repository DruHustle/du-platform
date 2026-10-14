import { describe, expect, it } from "vitest";
import {
  getPasswordIssue,
  PASSWORD_ERROR_MESSAGES,
} from "../../../../shared/passwordPolicy";
import { registerSchema, resetPasswordSchema } from "../dto/auth.dto";

const cases = [
  ["Ab1!", "too_short"],
  ["a".repeat(256), "too_long"],
  ["lowercase123!", "uppercase"],
  ["UppercaseOnly!", "number"],
  ["Uppercase123", "special"],
  ["ValidPassword123!", null],
] as const;

describe("shared password policy", () => {
  it.each(cases)(
    "applies the same account form and API rules to %s",
    (password, expected) => {
      expect(getPasswordIssue(password)).toBe(expected);
      const register = registerSchema.safeParse({
        fullName: "Test User",
        email: "test@example.com",
        password,
        confirmPassword: password,
      });
      const reset = resetPasswordSchema.safeParse({
        token: "test-token",
        password,
        confirmPassword: password,
      });
      expect(register.success).toBe(expected === null);
      expect(reset.success).toBe(expected === null);
      if (expected && !register.success)
        expect(register.error.issues[0].message).toBe(
          PASSWORD_ERROR_MESSAGES[expected]
        );
    }
  );
});
