export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 255;

export const PASSWORD_ERROR_MESSAGES = {
  too_short: "Password must be at least 8 characters.",
  too_long: "Password must be at most 255 characters.",
  uppercase: "Password must contain at least one uppercase letter.",
  number: "Password must contain at least one number.",
  special: "Password must contain at least one special character.",
} as const;

export type PasswordIssue = keyof typeof PASSWORD_ERROR_MESSAGES;

/** Shared by account forms and the API so a valid-looking form cannot be rejected for a different policy. */
export function getPasswordIssue(password: string): PasswordIssue | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "too_short";
  if (password.length > PASSWORD_MAX_LENGTH) return "too_long";
  if (!/[A-Z]/.test(password)) return "uppercase";
  if (!/[0-9]/.test(password)) return "number";
  if (!/[^A-Za-z0-9]/.test(password)) return "special";
  return null;
}
