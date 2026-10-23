export function configuredAdminEmails(): string[] {
  return Array.from(
    new Set(
      String(process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map(email => email.trim().toLowerCase())
        .filter(
          email =>
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
        )
    )
  );
}
export function isAdminEmail(email: string): boolean {
  return configuredAdminEmails().includes(
    String(email ?? "")
      .trim()
      .toLowerCase()
  );
}
