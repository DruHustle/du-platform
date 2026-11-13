// Gate new fragment links while Oracle is released before its frontend.
export const PASSWORD_RESET_PAGE_MARKER =
  'name="du-password-reset-version" content="2"';

// Only public navigation destinations belong in an email. Keep arbitrary URLs,
// search values, order references and fragments out of the delivery payload.
const recoveryDestinations = new Set([
  "/travel/flights", "/travel/stays", "/travel/my-trips", "/account-deletion", "/admin",
]);

export function passwordResetLink(origin: string, language: string, token: string, next?: string): string {
  const url = new URL("/reset-password", origin);
  url.searchParams.set("lng", language);
  if (next && recoveryDestinations.has(next)) url.searchParams.set("next", next);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}
