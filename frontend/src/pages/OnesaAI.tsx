import { api } from "@/lib/api";

export type OnesaChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type OnesaHealthStatus = {
  online: boolean;
  statusText: string;
};

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
  const checkLegacyHealth = async (): Promise<OnesaHealthStatus> => {
    try {
      const response = await api.get("/onesa/health", { timeout: 10000 });
      const payload = parseObjectPayload(response.data);
      const online = Boolean(payload?.ok ?? payload?.modelAvailable);
      return { online, statusText: online ? "" : backendUnreachableStatus };
    } catch {
      return { online: false, statusText: backendUnreachableStatus };
    }
  };

  try {
    const response = await api.get("/onesa/ready", { timeout: 12000 });
    const payload = parseObjectPayload(response.data);
    if (!payload) return await checkLegacyHealth();
    const online = Boolean(payload?.ready === true);
    return { online, statusText: online ? "" : backendUnreachableStatus };
  } catch (err: any) {
    if (Number(err?.response?.status) === 404) {
      return await checkLegacyHealth();
    }
    return { online: false, statusText: backendUnreachableStatus };
  }
}

export async function sendOnesaChatMessage(input: {
  messages: OnesaChatMessage[];
  language: string;
}) {
  return api.post(
    "/onesa/chat",
    {
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
      language: input.language,
    },
    { timeout: 12000 }
  );
}
