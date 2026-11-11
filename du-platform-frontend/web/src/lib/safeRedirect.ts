/** Accept only app-relative paths; URL parsing otherwise normalizes backslashes into hosts. */
export function safeRedirectPath(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  )
    return "/";
  return value;
}

export function returnPathFromSearch(search: string): string {
  return safeRedirectPath(new URLSearchParams(search).get("next"));
}

export function authPageLink(
  path: "/login" | "/register" | "/forgot-password",
  returnPath: string
): string {
  return returnPath === "/"
    ? path
    : `${path}?next=${encodeURIComponent(returnPath)}`;
}
