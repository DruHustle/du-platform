import crypto from "crypto";
import type mysql from "mysql2/promise";
import { db, isDbConnectionError } from "../databaseRuntime";

// ── Per-email login lockout (in-memory) ─────────────────────────────────────
// Provides a secondary defense against credential stuffing when the per-IP
// rate limit alone cannot catch distributed attacks targeting a single account.
// Resets on process restart; the per-IP rate limiter is the primary hard gate.

const LOCKOUT_MAX_FAILURES = 10;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

type LockoutEntry = {
  failures: number;
  windowStart: number;
  lockedUntil: number | null;
};
const loginLockouts = new Map<string, LockoutEntry>();

function pruneLoginLockouts() {
  const now = Date.now();
  loginLockouts.forEach((entry, key) => {
    const expired = entry.lockedUntil
      ? now > entry.lockedUntil
      : now > entry.windowStart + LOCKOUT_WINDOW_MS;
    if (expired) loginLockouts.delete(key);
  });
}

export function recordLoginFailure(emailKey: string): void {
  pruneLoginLockouts();
  const now = Date.now();
  const entry = loginLockouts.get(emailKey);
  if (!entry || now > entry.windowStart + LOCKOUT_WINDOW_MS) {
    loginLockouts.set(emailKey, {
      failures: 1,
      windowStart: now,
      lockedUntil: null,
    });
    return;
  }
  entry.failures += 1;
  if (entry.failures >= LOCKOUT_MAX_FAILURES) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
}

export function clearLoginFailures(emailKey: string): void {
  loginLockouts.delete(emailKey);
}

export function isLoginLocked(emailKey: string): {
  locked: boolean;
  retryAfterMs: number;
} {
  pruneLoginLockouts();
  const entry = loginLockouts.get(emailKey);
  if (!entry?.lockedUntil) return { locked: false, retryAfterMs: 0 };
  const remaining = entry.lockedUntil - Date.now();
  if (remaining <= 0) {
    loginLockouts.delete(emailKey);
    return { locked: false, retryAfterMs: 0 };
  }
  return { locked: true, retryAfterMs: remaining };
}

type MemoryUser = {
  email_verified_at?: string | null;
  auth_version?: number;
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  created_at: string;
};

type MemorySession = {
  token_hash: string;
  user_id: number;
  expires_at: string;
};

type MemoryPasswordResetToken = {
  token_hash: string;
  user_id: number;
  expires_at: string;
  used_at: string | null;
};

const memoryUsers: MemoryUser[] = [];
const memoryAuthSessions: MemorySession[] = [];
const memoryPasswordResetTokens: MemoryPasswordResetToken[] = [];

// Monotonic counter — avoids ID collisions if entries are ever spliced out.
let memoryUserIdCounter = 0;

function createMemoryUser(
  fullName: string,
  email: string,
  passwordHash: string
): MemoryUser {
  return {
    id: ++memoryUserIdCounter,
    full_name: fullName,
    email,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  };
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function findUserByEmail(email: string) {
  if (!db)
    return (
      memoryUsers.find(
        user => user.email.toLowerCase() === email.toLowerCase()
      ) ?? null
    );

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return (
      memoryUsers.find(
        user => user.email.toLowerCase() === email.toLowerCase()
      ) ?? null
    );
  }
}

export async function findUserById(id: number) {
  if (!db) return memoryUsers.find(user => user.id === id) ?? null;

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return memoryUsers.find(user => user.id === id) ?? null;
  }
}

export async function createUser(
  fullName: string,
  email: string,
  passwordHash: string
) {
  if (!db) {
    const user = createMemoryUser(fullName, email, passwordHash);
    memoryUsers.push(user);
    return user;
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>(
      "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
      [fullName, email, passwordHash]
    );

    return {
      id: result.insertId,
      full_name: fullName,
      email,
      password_hash: passwordHash,
    };
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const user = createMemoryUser(fullName, email, passwordHash);
    memoryUsers.push(user);
    return user;
  }
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  if (!db) {
    const user = memoryUsers.find(entry => entry.id === userId);
    if (user) {
      user.password_hash = passwordHash;
      user.email_verified_at = new Date().toISOString();
      user.auth_version = (user.auth_version ?? 0) + 1;
    }
    return;
  }

  try {
    await db.execute(
      "UPDATE users SET password_hash = ?, email_verified_at = CURRENT_TIMESTAMP, auth_version = auth_version + 1 WHERE id = ?",
      [passwordHash, userId]
    );
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const user = memoryUsers.find(entry => entry.id === userId);
    if (user) {
      user.password_hash = passwordHash;
      user.email_verified_at = new Date().toISOString();
      user.auth_version = (user.auth_version ?? 0) + 1;
    }
  }
}

export class AuthVersionChangedError extends Error {
  constructor() {
    super("Account credentials changed. Please sign in again.");
  }
}

export async function createSession(
  userId: number,
  ttlHours = 24 * 7,
  expectedAuthVersion?: number
) {
  const token = crypto.randomBytes(48).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  if (!db) {
    if (expectedAuthVersion !== undefined) {
      const user = memoryUsers.find(entry => entry.id === userId);
      if (!user || (user.auth_version ?? 0) !== expectedAuthVersion)
        throw new AuthVersionChangedError();
    }
    memoryAuthSessions.push({
      token_hash: tokenHash,
      user_id: userId,
      expires_at: expiresAt.toISOString(),
    });
  } else {
    try {
      if (expectedAuthVersion !== undefined) {
        const connection = await db.getConnection();
        try {
          await connection.beginTransaction();
          const [rows] = await connection.query<mysql.RowDataPacket[]>(
            "SELECT auth_version FROM users WHERE id = ? FOR UPDATE",
            [userId]
          );
          if (
            !rows.length ||
            Number(rows[0].auth_version) !== expectedAuthVersion
          )
            throw new AuthVersionChangedError();
          await connection.execute(
            "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            [tokenHash, userId, expiresAt]
          );
          await connection.commit();
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      } else
        await db.execute(
          "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
          [tokenHash, userId, expiresAt]
        );
    } catch (error) {
      if (expectedAuthVersion !== undefined) throw error;
      if (!isDbConnectionError(error)) throw error;
      memoryAuthSessions.push({
        token_hash: tokenHash,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
      });
    }
  }

  return { token, tokenHash, expiresAt };
}

export async function getSession(token: string) {
  const tokenHash = sha256(token);

  if (!db) {
    const session = memoryAuthSessions.find(
      entry => entry.token_hash === tokenHash
    );
    if (!session) return null;
    if (new Date(session.expires_at).getTime() < Date.now()) {
      const index = memoryAuthSessions.findIndex(
        entry => entry.token_hash === tokenHash
      );
      if (index >= 0) memoryAuthSessions.splice(index, 1);
      return null;
    }
    return session;
  }

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT token_hash, user_id, expires_at FROM auth_sessions WHERE token_hash = ? LIMIT 1",
      [tokenHash]
    );
    const session = rows[0];
    if (!session) return null;

    const expiresAt = new Date(session.expires_at);
    if (expiresAt.getTime() < Date.now()) {
      await db.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [
        tokenHash,
      ]);
      return null;
    }
    return session;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const session = memoryAuthSessions.find(
      entry => entry.token_hash === tokenHash
    );
    if (!session) return null;
    if (new Date(session.expires_at).getTime() < Date.now()) return null;
    return session;
  }
}

export async function deleteSession(token: string) {
  const tokenHash = sha256(token);

  if (!db) {
    const index = memoryAuthSessions.findIndex(
      entry => entry.token_hash === tokenHash
    );
    if (index >= 0) memoryAuthSessions.splice(index, 1);
    return;
  }

  try {
    await db.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [
      tokenHash,
    ]);
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const index = memoryAuthSessions.findIndex(
      entry => entry.token_hash === tokenHash
    );
    if (index >= 0) memoryAuthSessions.splice(index, 1);
  }
}

export async function deleteAllSessionsForUser(userId: number) {
  if (!db) {
    const count = memoryAuthSessions.length;
    memoryAuthSessions.splice(
      0,
      count,
      ...memoryAuthSessions.filter(s => s.user_id !== userId)
    );
    return;
  }

  try {
    await db.execute("DELETE FROM auth_sessions WHERE user_id = ?", [userId]);
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const count = memoryAuthSessions.length;
    memoryAuthSessions.splice(
      0,
      count,
      ...memoryAuthSessions.filter(s => s.user_id !== userId)
    );
  }
}

export async function deleteAllSessionsForUserStrict(userId: number) {
  if (!db) {
    throw new Error("Persistent session store is unavailable.");
  }

  await db.execute("DELETE FROM auth_sessions WHERE user_id = ?", [userId]);
}

export async function createPasswordResetToken(
  userId: number,
  ttlMinutes = 30
) {
  const token = crypto.randomBytes(48).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  if (!db) {
    memoryPasswordResetTokens.push({
      token_hash: tokenHash,
      user_id: userId,
      expires_at: expiresAt.toISOString(),
      used_at: null,
    });
  } else {
    try {
      await db.execute(
        "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
        [tokenHash, userId, expiresAt]
      );
    } catch (error) {
      if (!isDbConnectionError(error)) throw error;
      memoryPasswordResetTokens.push({
        token_hash: tokenHash,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
        used_at: null,
      });
    }
  }

  return { token, tokenHash, expiresAt };
}

export async function consumePasswordResetToken(rawToken: string) {
  const tokenHash = sha256(rawToken);

  if (!db) {
    const row = memoryPasswordResetTokens.find(
      entry => entry.token_hash === tokenHash
    );
    if (!row || row.used_at) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;
    row.used_at = new Date().toISOString();
    return row;
  }

  try {
    // Atomic single-statement consumption: only succeeds if token exists, is unused, and not expired.
    // This prevents race conditions where two concurrent requests consume the same token.
    const [result] = await db.execute<mysql.ResultSetHeader>(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()",
      [tokenHash]
    );
    if (result.affectedRows === 0) return null;

    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT token_hash, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ? LIMIT 1",
      [tokenHash]
    );
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const row = memoryPasswordResetTokens.find(
      entry => entry.token_hash === tokenHash
    );
    if (!row || row.used_at) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;
    row.used_at = new Date().toISOString();
    return row;
  }
}

/** Commit the password, token invalidation and session revocation together. */
export async function resetPasswordWithToken(
  rawToken: string,
  passwordHash: string
) {
  const tokenHash = sha256(rawToken);
  if (!db) {
    const token = memoryPasswordResetTokens.find(
      entry => entry.token_hash === tokenHash
    );
    if (
      !token ||
      token.used_at ||
      new Date(token.expires_at).getTime() <= Date.now()
    )
      return false;
    const user = memoryUsers.find(entry => entry.id === token.user_id);
    if (!user) return false;
    const now = new Date().toISOString();
    user.password_hash = passwordHash;
    user.email_verified_at = now;
    user.auth_version = (user.auth_version ?? 0) + 1;
    for (const entry of memoryPasswordResetTokens) {
      if (entry.user_id === user.id && !entry.used_at) entry.used_at = now;
    }
    for (let i = memoryAuthSessions.length - 1; i >= 0; i--) {
      if (memoryAuthSessions[i].user_id === user.id)
        memoryAuthSessions.splice(i, 1);
    }
    clearLoginFailures(user.email);
    return true;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [tokens] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT user_id FROM password_reset_tokens WHERE token_hash = ? LIMIT 1",
      [tokenHash]
    );
    if (!tokens.length) {
      await connection.rollback();
      return false;
    }
    const userId = Number(tokens[0].user_id);
    // Lock the user first so different reset tokens for one account serialize
    // without acquiring token locks in opposite orders.
    const [users] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id, email FROM users WHERE id = ? FOR UPDATE",
      [userId]
    );
    if (!users.length) {
      await connection.rollback();
      return false;
    }
    const [consumed] = await connection.execute<mysql.ResultSetHeader>(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()",
      [tokenHash]
    );
    if (!consumed.affectedRows) {
      await connection.rollback();
      return false;
    }
    await connection.execute(
      "UPDATE users SET password_hash = ?, email_verified_at = CURRENT_TIMESTAMP, auth_version = auth_version + 1 WHERE id = ?",
      [passwordHash, userId]
    );
    await connection.execute(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
      [userId]
    );
    await connection.execute("DELETE FROM auth_sessions WHERE user_id = ?", [
      userId,
    ]);
    await connection.commit();
    clearLoginFailures(String(users[0].email));
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
