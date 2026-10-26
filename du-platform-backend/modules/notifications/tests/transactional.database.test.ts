import { randomBytes, randomUUID } from "node:crypto";
import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import mysql, { type Pool } from "mysql2/promise";
const url = process.env.SHOP_TEST_DATABASE_URL;
if (
  url &&
  (!["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
    !new URL(url).pathname.endsWith("_test"))
)
  throw new Error("Disposable localhost *_test database required");
describe.skipIf(!url)("durable transactional messages", () => {
  let pool: Pool,
    service: any,
    worker: any,
    crypto: any,
    auth: any,
    AuthService: any;
  const database = `du_service_${randomBytes(6).toString("hex")}_test`;
  beforeAll(async () => {
    const admin = mysql.createPool(url!);
    await admin.query(`CREATE DATABASE ${database}`);
    await admin.end();
    const local = new URL(url!);
    local.pathname = "/" + database;
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", local.toString());
    vi.stubEnv("JWT_SECRET", "synthetic-service-tests-runtime-key");
    vi.stubEnv("FROM_EMAIL", "service@example.test");
    vi.stubEnv("ADMIN_EMAILS", "operator@example.test");
    vi.stubEnv("APP_BASE_URL", "https://fixture.example.test");
    vi.resetModules();
    pool = (await import("../../../shared/databaseRuntime")).db!;
    await (await import("../../../db")).initializeDatabase();
    service = new (
      await import("../transactionalService")
    ).TransactionalService(pool);
    worker = (await import("../transactionalWorker"))
      .processTransactionalMessages;
    crypto = await import("../../shop/orderAccess");
    auth = await import("../../../shared/persistence/authStore");
    AuthService = (await import("../../auth/services/authService")).AuthService;
  });
  beforeEach(async () => {
    vi.stubEnv("ADMIN_EMAILS", "operator@example.test");
    await pool.execute(
      "UPDATE admin_settings SET value_text='operator@example.test' WHERE key_name='notify_alert_emails'"
    );
    vi.stubEnv("RECOVERY_MODE", "false");
    vi.stubEnv("OUTBOUND_MESSAGES_PAUSED", "false");
    await pool.query("DELETE FROM transactional_messages");
    await pool.query("DELETE FROM contact_enquiries");
  });
  afterAll(async () => {
    await pool?.end();
    const admin = mysql.createPool(url!);
    await admin.query(`DROP DATABASE IF EXISTS ${database}`);
    await admin.end();
    vi.unstubAllEnvs();
  });
  const enquiry = (extra = {}) => ({
    requestId: randomUUID(),
    name: "Synthetic <img src=x>",
    email: "fixture@example.test",
    subject: "<script>Question</script>",
    message: "<script>private</script>\nNext line",
    language: "de",
    ...extra,
  });
  const jobs = async () => {
    const [rows] = await pool.query<any[]>(
      "SELECT * FROM transactional_messages ORDER BY id"
    );
    return rows;
  };
  const due = async () =>
    pool.query(
      "UPDATE transactional_messages SET available_at=NOW(),locked_at=DATE_SUB(NOW(),INTERVAL 6 MINUTE)"
    );
  async function user() {
    return auth.createUser(
      "Fixture",
      `${randomUUID()}@example.test`,
      "original-hash"
    );
  }
  it("stores enquiry and independent notification intents atomically, without marketing consent", async () => {
    const input = enquiry();
    const result = await service.contact(input);
    expect(result).toMatchObject({
      received: true,
      requestId: input.requestId,
    });
    const rows = await jobs();
    expect(rows.map((r: any) => r.kind)).toEqual([
      "contact_operator",
      "contact_ack",
    ]);
    expect(JSON.stringify(rows)).not.toContain(input.email);
    expect(JSON.stringify(rows)).not.toContain("<script>");
    const mail = JSON.parse(crypto.openOrderAccess(rows[0].encrypted_payload));
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).not.toContain("<script>");
    expect(mail.subject).not.toMatch(/[\r\n]/);
    const inbox = await service.inbox();
    expect(inbox[0].details).toMatchObject({
      name: input.name,
      message: input.message,
      language: "de",
    });
    expect(
      JSON.parse(crypto.openOrderAccess(rows[1].encrypted_payload)).html
    ).toContain('lang="de"');
    const [[count]] = await pool.query<any[]>(
      "SELECT COUNT(*) AS n FROM newsletter_subscriptions"
    );
    expect(count.n).toBe(0);
  });
  it("serializes duplicate lost-response retries and rejects payload changes; genuinely new IDs remain new enquiries", async () => {
    const input = enquiry();
    await Promise.all(Array.from({ length: 6 }, () => service.contact(input)));
    expect(await jobs()).toHaveLength(2);
    await expect(
      service.contact({ ...input, message: "different" })
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(await jobs()).toHaveLength(2);
    await service.contact({ ...input, requestId: randomUUID() });
    expect(await jobs()).toHaveLength(4);
  });
  it("rolls back the receipt if either email intent cannot be persisted", async () => {
    const original = pool.getConnection.bind(pool);
    const c = await original();
    const execute = c.execute.bind(c);
    let writes = 0;
    const proxy = new Proxy(c, {
      get(target, key) {
        if (key === "execute")
          return async (sql: any, values: any) => {
            if (
              String(sql).includes("INSERT INTO transactional_messages") &&
              ++writes === 2
            )
              throw new Error("Synthetic outbox failure");
            return execute(sql, values);
          };
        const v = Reflect.get(target, key);
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
    const fake = { getConnection: async () => proxy };
    const Service = service.constructor;
    await expect(new Service(fake).contact(enquiry())).rejects.toThrow(
      "Synthetic outbox failure"
    );
    const [[count]] = await pool.query<any[]>(
      "SELECT COUNT(*) AS n FROM contact_enquiries"
    );
    expect(count.n).toBe(0);
    expect(await jobs()).toHaveLength(0);
  });
  it("does not invalidate a durable receipt when customer acknowledgement delivery fails", async () => {
    const input = enquiry();
    await service.contact(input);
    const send = vi.fn(async (_mail: any, key: string) => {
      if (key.endsWith("/ack")) throw { response: { status: 422 } };
      return "provider-operator";
    });
    await worker(pool, send);
    expect((await jobs()).map((r: any) => r.status)).toEqual([
      "accepted",
      "failed",
    ]);
    expect((await service.inbox())[0].request_id).toBe(input.requestId);
  });
  it("reuses the immutable payload and key after a timeout following acceptance", async () => {
    await service.contact(enquiry());
    const sent = new Map(),
      calls: any[] = [];
    let interrupted = true;
    const send = async (mail: any, key: string) => {
      calls.push({ mail, key });
      sent.set(key, "provider-id");
      if (interrupted) {
        interrupted = false;
        throw new Error("Synthetic lost response");
      }
      return sent.get(key);
    };
    await worker(pool, send, 1);
    expect((await jobs())[0].status).toBe("pending");
    await due();
    await worker(pool, send, 1);
    expect(calls[0]).toEqual(calls[1]);
    expect(sent.size).toBe(1);
    expect((await jobs())[0].status).toBe("accepted");
  });
  it("keeps the retry clock and key after provider acceptance followed by database failure and worker restart", async () => {
    await service.contact(enquiry());
    const original = pool.getConnection.bind(pool);
    const sent = new Map();
    const calls: any[] = [];
    const c = await original();
    const execute = c.execute.bind(c);
    const proxy = new Proxy(c, {
      get(target, key) {
        if (key === "execute")
          return async (sql: any, values: any) => {
            if (
              String(sql).includes("status='accepted'") ||
              String(sql).includes("acceptance_uncertain=?")
            )
              throw new Error("Synthetic disconnected database");
            return execute(sql, values);
          };
        const v = Reflect.get(target, key);
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
    const send = async (mail: any, key: string) => {
      calls.push({ mail, key });
      sent.set(key, "provider-id");
      return "provider-id";
    };
    await expect(
      worker({ getConnection: async () => proxy }, send, 1)
    ).rejects.toThrow();
    const first = (await jobs())[0];
    expect(first.status).toBe("processing");
    expect(first.first_attempt_at).toBeTruthy();
    expect(Number(first.acceptance_uncertain)).toBe(1);
    await due();
    await worker(pool, send, 1);
    const last = (await jobs())[0];
    expect(last.status).toBe("accepted");
    expect(last.first_attempt_at).toEqual(first.first_attempt_at);
    expect(sent.size).toBe(1);
    expect(calls[0]).toEqual(calls[1]);
  });
  it("stops uncertain automatic replay outside 23 hours and exposes reconciliation instead of replacement", async () => {
    await service.contact(enquiry());
    const [job] = await jobs();
    await pool.execute(
      "UPDATE transactional_messages SET first_attempt_at=DATE_SUB(NOW(),INTERVAL 24 HOUR),acceptance_uncertain=TRUE WHERE id=?",
      [job.id]
    );
    const send = vi.fn();
    await worker(pool, send, 1);
    expect(send).not.toHaveBeenCalled();
    expect((await jobs())[0].status).toBe("reconcile");
    await expect(service.act(job.id, "retry", 1)).rejects.toMatchObject({
      statusCode: 409,
    });
    await service.act(job.id, "accepted", 1, "verified-provider-id");
    expect((await jobs())[0]).toMatchObject({
      status: "accepted",
      provider_id: "verified-provider-id",
      reconciled_by: 1,
    });
    expect(send).not.toHaveBeenCalled();
  });
  it("allows an authorised bounded retry with the same key, never resetting the clock", async () => {
    await service.contact(enquiry());
    const send = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 422 } })
      .mockResolvedValue("provider-id");
    await worker(pool, send, 1);
    const first = (await jobs())[0];
    await service.act(first.id, "retry", 1);
    await worker(pool, send, 1);
    expect(send.mock.calls[0]).toEqual(send.mock.calls[1]);
    const last = (await jobs())[0];
    expect(last.first_attempt_at).toEqual(first.first_attempt_at);
    expect(last.last_retry_by).toBe(1);
  });
  it.each(["RECOVERY_MODE", "OUTBOUND_MESSAGES_PAUSED"])(
    "holds persisted queues under %s",
    async flag => {
      await service.contact(enquiry());
      const before = await jobs();
      vi.stubEnv(flag, "true");
      const send = vi.fn();
      await worker(pool, send);
      expect(send).not.toHaveBeenCalled();
      expect(await jobs()).toEqual(before);
    }
  );
  it("persists a reset token and encrypted immutable email together with the unchanged 30-minute lifetime", async () => {
    const u = await user();
    await service.passwordReset(u.id, "sn");
    const [job] = await jobs();
    const payload = JSON.parse(crypto.openOrderAccess(job.encrypted_payload));
    const token = payload.text.match(/#token=([a-f0-9]{96})/)[1];
    expect(JSON.stringify(await service.messageDeliveries())).not.toContain(
      token
    );
    expect(JSON.stringify(job)).not.toContain(token);
    expect(payload.html).toContain('lang="sn"');
    const [[row]] = await pool.query<any[]>(
      "SELECT TIMESTAMPDIFF(SECOND,NOW(),expires_at) AS ttl FROM password_reset_tokens WHERE token_hash=?",
      [job.reset_hash]
    );
    expect(row.ttl).toBeGreaterThan(1780);
    expect(row.ttl).toBeLessThanOrEqual(1800);
  });
  it("rolls back reset tokens when the email intent cannot be saved", async () => {
    const u = await user();
    const c = await pool.getConnection(),
      execute = c.execute.bind(c);
    const proxy = new Proxy(c, {
      get(target, key) {
        if (key === "execute")
          return async (sql: any, values: any) => {
            if (String(sql).includes("INSERT INTO transactional_messages"))
              throw new Error("Synthetic persistence failure");
            return execute(sql, values);
          };
        const v = Reflect.get(target, key);
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
    await expect(
      new service.constructor({
        getConnection: async () => proxy,
      }).passwordReset(u.id)
    ).rejects.toThrow();
    const [[count]] = await pool.query<any[]>(
      "SELECT COUNT(*) AS n FROM password_reset_tokens WHERE user_id=?",
      [u.id]
    );
    expect(count.n).toBe(0);
  });
  it.each(["expired", "consumed", "changed-version", "changed-email"])(
    "suppresses reset delivery when credential is %s",
    async reason => {
      const u = await user();
      await service.passwordReset(u.id);
      const [job] = await jobs();
      if (reason === "expired")
        await pool.execute(
          "UPDATE password_reset_tokens SET expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE token_hash=?",
          [job.reset_hash]
        );
      if (reason === "consumed")
        await pool.execute(
          "UPDATE password_reset_tokens SET used_at=NOW() WHERE token_hash=?",
          [job.reset_hash]
        );
      if (reason === "changed-version")
        await pool.execute(
          "UPDATE users SET auth_version=auth_version+1 WHERE id=?",
          [u.id]
        );
      if (reason === "changed-email")
        await pool.execute("UPDATE users SET email=? WHERE id=?", [
          randomUUID() + "@example.test",
          u.id,
        ]);
      const send = vi.fn();
      await worker(pool, send, 1);
      expect(send).not.toHaveBeenCalled();
      expect((await jobs())[0].status).toBe("skipped");
    }
  );
  it("serializes reset delivery against password change and suppresses other queued reset messages afterward", async () => {
    const u = await user();
    await service.passwordReset(u.id);
    await service.passwordReset(u.id);
    const [job] = await jobs(),
      token = JSON.parse(
        crypto.openOrderAccess(job.encrypted_payload)
      ).text.match(/#token=([a-f0-9]{96})/)[1];
    let release: any, started: any;
    const held = new Promise(r => (release = r)),
      sending = new Promise(r => (started = r));
    const send = vi.fn(async () => {
      started();
      await held;
      return "accepted-before-reset";
    });
    const delivering = worker(pool, send, 1);
    await sending;
    let resetDone = false;
    const reset = auth
      .resetPasswordWithToken(token, "replacement-hash")
      .then((r: any) => {
        resetDone = true;
        return r;
      });
    await new Promise(r => setTimeout(r, 50));
    expect(resetDone).toBe(false);
    release();
    await delivering;
    expect(await reset).toBe(true);
    const again = vi.fn();
    await worker(pool, again);
    expect(again).not.toHaveBeenCalled();
    expect((await jobs())[1].status).toBe("skipped");
  });
  it("queues feature acknowledgements only for a newly saved request, escaping input and leaving marketing unchanged", async () => {
    const u = await user();
    const feature = "<script>synthetic</script>";
    await service.feature(u.id, feature);
    await service.feature(u.id, feature);
    expect(await jobs()).toHaveLength(2);
    for (const job of await jobs()) {
      const payload = JSON.parse(crypto.openOrderAccess(job.encrypted_payload));
      expect(payload.html).not.toContain("<script>");
      expect(payload.html).toContain("&lt;script&gt;");
    }
  });
  it("returns neutral forgot-password responses without calling a slow or unavailable provider on the HTTP path", async () => {
    const u = await user();
    const sender = vi.fn(async () => {
      await new Promise(r => setTimeout(r, 10000));
      throw new Error("Synthetic slow provider");
    });
    const axios = await import("axios");
    const spy = vi
      .spyOn(axios.default, "post")
      .mockImplementation(sender as any);
    try {
      const responses = await Promise.all([
        new AuthService().forgotPassword({ email: u.email }),
        new AuthService().forgotPassword({ email: "unknown@example.test" }),
      ]);
      expect(responses[0]).toEqual(responses[1]);
      expect(sender).not.toHaveBeenCalled();
      expect(await jobs()).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });
  it("is restart-safe and never generates historical deliveries during migration", async () => {
    const before = await jobs();
    await (await import("../schema")).initializeTransactionalMessages(pool);
    await (await import("../schema")).initializeTransactionalMessages(pool);
    expect(await jobs()).toEqual(before);
  });
  it("cancels a queued notification without removing its durable enquiry or other acknowledgement", async () => {
    const input = enquiry();
    await service.contact(input);
    const [job] = await jobs();
    await service.act(job.id, "close", 1);
    const send = vi.fn(async () => "provider-ack");
    await worker(pool, send);
    expect((await jobs()).map((r: any) => r.status)).toEqual([
      "cancelled",
      "accepted",
    ]);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][1]).not.toBe(`du-service/${job.intent_key}`);
    expect((await service.inbox())[0].request_id).toBe(input.requestId);
  });
  it("does not claim cancellation after a provider operation has already begun", async () => {
    await service.contact(enquiry());
    const [job] = await jobs();
    let started: any, release: any;
    const entered = new Promise(r => (started = r)),
      held = new Promise(r => (release = r));
    const send = async () => {
      started();
      await held;
      return "provider-in-flight";
    };
    const sending = worker(pool, send, 1);
    await entered;
    const closing = service.act(job.id, "close", 1).then(
      () => true,
      () => false
    );
    release();
    await sending;
    expect(await closing).toBe(false);
    expect((await jobs())[0].status).toBe("accepted");
  });
  it("bounds automatic attempts and does not extend reset validity during retries", async () => {
    const u = await user();
    await service.passwordReset(u.id);
    const [job] = await jobs();
    const [[before]] = await pool.query<any[]>(
      "SELECT expires_at FROM password_reset_tokens WHERE token_hash=?",
      [job.reset_hash]
    );
    const send = vi.fn(async () => {
      throw { response: { status: 503 } };
    });
    for (let n = 0; n < 6; n++) {
      await due();
      await worker(pool, send, 1);
    }
    expect(send).toHaveBeenCalledTimes(5);
    expect((await jobs())[0].status).toBe("failed");
    const [[after]] = await pool.query<any[]>(
      "SELECT expires_at FROM password_reset_tokens WHERE token_hash=?",
      [job.reset_hash]
    );
    expect(after.expires_at).toEqual(before.expires_at);
  });
  it("does not create retrospective acknowledgement jobs for an existing feature request", async () => {
    const u = await user();
    await pool.execute(
      "INSERT INTO feature_notifications(user_id,email,feature) VALUES (?,?,'legacy-feature')",
      [u.id, u.email]
    );
    expect((await service.feature(u.id, "legacy-feature")).created).toBe(false);
    expect(await jobs()).toHaveLength(0);
  });
  it("holds fragment-link resets until the compatible frontend is published without extending token lifetime", async () => {
    const u = await user();
    await service.passwordReset(u.id);
    const [job] = await jobs();
    const send = vi.fn(async () => "provider-reset");
    await worker(pool, send, 1, async () => false);
    const held = (await jobs())[0];
    expect(held.status).toBe("pending");
    expect(held.attempts).toBe(0);
    expect(held.first_attempt_at).toBeNull();
    expect(send).not.toHaveBeenCalled();
    await due();
    await worker(pool, send, 1, async () => true);
    expect(send).toHaveBeenCalledOnce();
    expect((await jobs())[0].id).toBe(job.id);
  });
  it("retains the contact inbox without an operator destination and safely binds routing before first provider use", async () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    await pool.execute(
      "UPDATE admin_settings SET value_text='' WHERE key_name='notify_alert_emails'"
    );
    const input = enquiry();
    await service.contact(input);
    const send = vi.fn(async () => "provider-configured-later");
    await worker(pool, send, 1);
    const [failed] = await jobs();
    expect(failed.status).toBe("failed");
    expect(failed.attempts).toBe(0);
    expect(failed.first_attempt_at).toBeNull();
    expect(send).not.toHaveBeenCalled();
    expect((await service.inbox())[0].request_id).toBe(input.requestId);
    await pool.execute(
      "UPDATE admin_settings SET value_text='new-operator@example.test' WHERE key_name='notify_alert_emails'"
    );
    await service.act(failed.id, "retry", 1);
    await worker(pool, send, 1);
    expect(send.mock.calls[0][0].to).toEqual(["new-operator@example.test"]);
  });
  it("cannot resurrect a cancellation made between queue selection and an expired-window update", async () => {
    await service.contact(enquiry());
    const [job] = await jobs();
    await pool.execute(
      "UPDATE transactional_messages SET first_attempt_at=DATE_SUB(NOW(),INTERVAL 24 HOUR) WHERE id=?",
      [job.id]
    );
    const c = await pool.getConnection(),
      query = c.query.bind(c);
    let closed = false;
    const proxy = new Proxy(c, {
      get(target, key) {
        if (key === "query")
          return async (sql: any, values: any) => {
            const result = await query(sql, values);
            if (
              String(sql).includes("FROM transactional_messages WHERE") &&
              !closed
            ) {
              closed = true;
              await service.act(job.id, "close", 1);
            }
            return result;
          };
        const v = Reflect.get(target, key);
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
    const send = vi.fn();
    await worker({ getConnection: async () => proxy }, send, 1);
    expect(send).not.toHaveBeenCalled();
    expect((await jobs())[0].status).toBe("cancelled");
  });
});
