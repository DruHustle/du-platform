type DbErrorLike = {
  code?: unknown;
  errno?: unknown;
  message?: unknown;
  sqlMessage?: unknown;
};

function asDbError(error: unknown): DbErrorLike {
  return (error ?? {}) as DbErrorLike;
}

export function isDuplicateEntryError(error: unknown): boolean {
  const candidate = asDbError(error);
  const code = String(candidate.code ?? "").toUpperCase();
  const errno = Number(candidate.errno);
  return code === "ER_DUP_ENTRY" || errno === 1062;
}

export function isUserEmailConflictError(error: unknown): boolean {
  if (!isDuplicateEntryError(error)) return false;

  const candidate = asDbError(error);
  const details = `${String(candidate.sqlMessage ?? "")} ${String(candidate.message ?? "")}`.toLowerCase();
  if (!details.trim()) return true;

  return (
    details.includes("users.email") ||
    details.includes("for key 'email'") ||
    details.includes('for key "email"') ||
    details.includes("uniq_users_email") ||
    details.includes("email")
  );
}
