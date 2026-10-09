import { api } from "@/lib/api";

export type OnesaChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type OnesaHealthStatus = {
  online: boolean;
  statusText: string;
};

const ONESA_HEALTH_CACHE_TTL_MS = 15_000;
let onesaHealthCache: { checkedAt: number; online: boolean } | null = null;
let onesaHealthInFlight: Promise<boolean> | null = null;

function parseObjectPayload(payload: unknown): Record<string, any> | null {
  if (typeof payload === "object" && payload !== null) return payload as Record<string, any>;
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, any>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function checkOnesaHealth(backendUnreachableStatus: string): Promise<OnesaHealthStatus> {
  const formatStatus = (online: boolean): OnesaHealthStatus => ({
    online,
    statusText: online ? "" : backendUnreachableStatus,
  });

  const now = Date.now();
  if (onesaHealthCache && now - onesaHealthCache.checkedAt < ONESA_HEALTH_CACHE_TTL_MS) {
    return formatStatus(onesaHealthCache.online);
  }

  const loadFreshHealth = async (): Promise<boolean> => {
    try {
      const response = await api.get("/ai/health", { timeout: 10000 });
      const payload = parseObjectPayload(response.data);
      return Boolean(payload?.ok ?? payload?.modelAvailable ?? payload?.ready);
    } catch {
      return false;
    }
  };

  onesaHealthInFlight ??= (async () => {
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
  })().finally(() => {
    onesaHealthInFlight = null;
  });

  const online = await onesaHealthInFlight;
  onesaHealthCache = { checkedAt: Date.now(), online };
  return formatStatus(online);
}

export function clearOnesaHealthCache() {
  onesaHealthCache = null;
  onesaHealthInFlight = null;
}

export async function sendOnesaChatMessage(input: {
  messages: OnesaChatMessage[];
  language: string;
}) {
  return api.post(
    "/ai/chat",
    {
      messages: input.messages.map((message) => ({ role: message.role, content: message.content })),
      language: input.language,
    },
    { timeout: 12000 }
  );
}

export async function requestOnesaTripPlan(
  payload: Record<string, unknown>,
  options?: { timeout?: number }
) {
  return api.post("/ai/trip-plan", payload, { timeout: options?.timeout ?? 12000 });
}
