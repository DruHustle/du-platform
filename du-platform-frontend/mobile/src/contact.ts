import { request } from "./api";

export type ContactAttempt = {
  name: string;
  email: string;
  subject: string;
  message: string;
  language: string;
  module: string;
  requestId: string;
};

export function readContactAttempt(raw: string): ContactAttempt {
  const value = JSON.parse(raw);
  const fields = ["name", "email", "subject", "message", "language", "module", "requestId"];
  if (!value || !fields.every(field => typeof value[field] === "string" && value[field].trim().length > 0))
    throw new Error("Your saved message could not be read.");
  return value;
}

export async function sendContactAttempt(body: ContactAttempt): Promise<string> {
  const receipt = await request<{ received?: boolean; requestId?: string }>("/notifications/contact", { method: "POST", body });
  if (receipt?.received !== true || receipt.requestId !== body.requestId)
    throw new Error("The service did not confirm this message.");
  return receipt.requestId;
}
