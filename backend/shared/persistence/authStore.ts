import crypto from "crypto";
import type mysql from "mysql2/promise";
import { db, isDbConnectionError } from "../databaseRuntime";

type MemoryUser = {
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  kyc_verified: 0 | 1;
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

function createMemoryUser(fullName: string, email: string, passwordHash: string): MemoryUser {
  return {
    id: memoryUsers.length + 1,
    full_name: fullName,
    email,
    password_hash: passwordHash,
    kyc_verified: 0,
    created_at: new Date().toISOString(),
  };
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function findUserByEmail(email: string) {
  if (!db) return memoryUsers.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return memoryUsers.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
  }
}

export async function findUserById(id: number) {
  if (!db) return memoryUsers.find((user) => user.id === id) ?? null;

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return memoryUsers.find((user) => user.id === id) ?? null;
  }
}

export async function createUser(fullName: string, email: string, passwordHash: string) {
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
    const user = memoryUsers.find((entry) => entry.id === userId);
    if (user) user.password_hash = passwordHash;
    return;
  }

  try {
    await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const user = memoryUsers.find((entry) => entry.id === userId);
    if (user) user.password_hash = passwordHash;
  }
}

export async function setUserKycVerified(userId: number, verified: boolean) {
  const normalizedUserId = Math.floor(Number(userId));
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return null;

  const value: 0 | 1 = verified ? 1 : 0;

  if (!db) {
    const user = memoryUsers.find((entry) => entry.id === normalizedUserId);
    if (!user) return null;
    user.kyc_verified = value;
    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      kyc_verified: Boolean(user.kyc_verified),
    };
  }

  try {
    await db.execute("UPDATE users SET kyc_verified = ? WHERE id = ?", [value, normalizedUserId]);
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, full_name, email, COALESCE(kyc_verified, 0) AS kyc_verified FROM users WHERE id = ? LIMIT 1",
      [normalizedUserId]
    );
    const row = rows[0];
    if (!row) return null;

    return {
      id: Number(row.id),
      full_name: String(row.full_name ?? ""),
      email: String(row.email ?? ""),
      kyc_verified: Boolean(Number(row.kyc_verified ?? 0)),
    };
  } catch (error: any) {
    if (String(error?.code ?? "") === "ER_BAD_FIELD_ERROR") {
      return null;
    }
    if (!isDbConnectionError(error)) throw error;

    const user = memoryUsers.find((entry) => entry.id === normalizedUserId);
    if (!user) return null;
    user.kyc_verified = value;
    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      kyc_verified: Boolean(user.kyc_verified),
    };
  }
}

export async function createSession(userId: number, ttlHours = 24 * 7) {
  const token = crypto.randomBytes(48).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  if (!db) {
    memoryAuthSessions.push({
      token_hash: tokenHash,
      user_id: userId,
      expires_at: expiresAt.toISOString(),
    });
  } else {
    try {
      await db.execute("INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [
        tokenHash,
        userId,
        expiresAt,
      ]);
    } catch (error) {
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
    const session = memoryAuthSessions.find((entry) => entry.token_hash === tokenHash);
    if (!session) return null;
    if (new Date(session.expires_at).getTime() < Date.now()) {
      const index = memoryAuthSessions.findIndex((entry) => entry.token_hash === tokenHash);
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
      await db.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [tokenHash]);
      return null;
    }
    return session;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const session = memoryAuthSessions.find((entry) => entry.token_hash === tokenHash);
    if (!session) return null;
    if (new Date(session.expires_at).getTime() < Date.now()) return null;
    return session;
  }
}

export async function deleteSession(token: string) {
  const tokenHash = sha256(token);

  if (!db) {
    const index = memoryAuthSessions.findIndex((entry) => entry.token_hash === tokenHash);
    if (index >= 0) memoryAuthSessions.splice(index, 1);
    return;
  }

  try {
    await db.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [tokenHash]);
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const index = memoryAuthSessions.findIndex((entry) => entry.token_hash === tokenHash);
    if (index >= 0) memoryAuthSessions.splice(index, 1);
  }
}

export async function createPasswordResetToken(userId: number, ttlMinutes = 30) {
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
      await db.execute("INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [
        tokenHash,
        userId,
        expiresAt,
      ]);
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
    const row = memoryPasswordResetTokens.find((entry) => entry.token_hash === tokenHash);
    if (!row || row.used_at) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;
    row.used_at = new Date().toISOString();
    return row;
  }

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT token_hash, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ? LIMIT 1",
      [tokenHash]
    );
    const row = rows[0];
    if (!row || row.used_at) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;

    await db.execute("UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ?", [tokenHash]);
    return row;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const row = memoryPasswordResetTokens.find((entry) => entry.token_hash === tokenHash);
    if (!row || row.used_at) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;
    row.used_at = new Date().toISOString();
    return row;
  }
}
