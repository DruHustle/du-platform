import { api } from "@/lib/api";

export type OnesaChatMessage = {
  role: "user" | "assistant";
  content: string;
  truncated?: boolean;
};

export type OnesaHealthStatus = {
  online: boolean;
  statusText: string;
};

const ONESA_HEALTH_CACHE_TTL_MS = 15_000;
const ONESA_CHAT_TIMEOUT_MS = 180_000;
let onesaHealthCache: { checkedAt: number; online: boolean } | null = null;
let onesaHealthInFlight: Promise<boolean> | null = null;
let onesaHealthVersion = 0;

function parseObjectPayload(payload: unknown): Record<string, any> | null {
  if (typeof payload === "object" && payload !== null)
    return payload as Record<string, any>;
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, any>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function checkOnesaHealth(
  backendUnreachableStatus: string
): Promise<OnesaHealthStatus> {
  const formatStatus = (online: boolean): OnesaHealthStatus => ({
    online,
    statusText: online ? "" : backendUnreachableStatus,
  });

  const now = Date.now();
  const version = onesaHealthVersion;
  if (
    onesaHealthCache &&
    now - onesaHealthCache.checkedAt < ONESA_HEALTH_CACHE_TTL_MS
  ) {
    return formatStatus(onesaHealthCache.online);
  }

  const loadFreshHealth = async (): Promise<boolean> => {
    try {
      const response = await api.get("/ai/health", { timeout: 10000 });
      const payload = parseObjectPayload(response.data);
      return (
        (payload?.ready ?? payload?.modelAvailable ?? payload?.ok) === true
      );
    } catch {
      return false;
    }
  };

  const loadReadiness = async () => {
    try {
      const response = await api.get("/ai/ready", { timeout: 12000 });
      const payload = parseObjectPayload(response.data);
      if (!payload) {
        return await loadFreshHealth();
      }
      return Boolean(payload?.ready === true);
    } catch {
      return await loadFreshHealth();
    }
  };
  if (!onesaHealthInFlight) {
    const pending = loadReadiness();
    onesaHealthInFlight = pending;
    void pending.finally(() => {
      if (onesaHealthInFlight === pending) onesaHealthInFlight = null;
    });
  }

  const online = await onesaHealthInFlight;
  if (version === onesaHealthVersion) {
    onesaHealthCache = { checkedAt: Date.now(), online };
  }
  return formatStatus(onesaHealthCache?.online ?? online);
}

// Reconnection should retry a failed check immediately while keeping healthy
// cached results and in-flight requests shared by both chat views.
export function invalidateOfflineOnesaHealth() {
  if (onesaHealthCache?.online === false) {
    onesaHealthVersion += 1;
    onesaHealthCache = null;
  }
}

export function clearOnesaHealthCache() {
  onesaHealthVersion += 1;
  onesaHealthCache = null;
  onesaHealthInFlight = null;
}

export async function sendOnesaChatMessage(input: {
  messages: OnesaChatMessage[];
  language: string;
  signal?: AbortSignal;
}) {
  const response = await api.post(
    "/ai/chat",
    {
      messages: input.messages.map(message => ({
        role: message.role,
        content: message.content,
      })),
      language: input.language,
    },
    {
      timeout: ONESA_CHAT_TIMEOUT_MS,
      ...(input.signal ? { signal: input.signal } : {}),
    }
  );
  input.signal?.throwIfAborted();
  const payload = parseObjectPayload(response.data);
  if (typeof payload?.reply !== "string" || !payload.reply.trim()) {
    throw new Error("Onesa returned an empty or invalid response.");
  }
  if (payload.truncated === true) {
    throw Object.assign(
      new Error(
        "Onesa could not finish a complete response. Please try again."
      ),
      { code: "ONESA_INCOMPLETE_REPLY" }
    );
  }
  onesaHealthVersion += 1;
  onesaHealthCache = { checkedAt: Date.now(), online: true };
  return {
    ...response,
    data: {
      reply: payload.reply.trim(),
      truncated: payload.truncated === true,
    },
  };
}

export async function requestOnesaTripPlan(
  payload: Record<string, unknown>,
  options?: { timeout?: number; signal?: AbortSignal }
) {
  return api.post("/ai/trip-plan", payload, {
    timeout: options?.timeout ?? 12000,
    signal: options?.signal,
  });
}
