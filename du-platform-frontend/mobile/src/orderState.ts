export type OrderIdentity = { orderRef: string; manageToken: string };
export type OrderCommand = { ref: string; version: number; requestId: string };
export type OrderWorkflow = {
  stage: string; version: number; quoteExpired: boolean; nextAction: string; carrier?: string; tracking?: string;
  history?: { command_id?: string }[];
  quotes?: { version: number; currency: string; total_cents: number; valid_until: string; items: { productId: number; productName: string; quantity: number; lineTotalCents: number; fulfilmentDetails?: string }[] }[];
};
export type OrderSnapshot = { order: OrderIdentity; workflow: OrderWorkflow };

export function sameOrder(a: OrderIdentity, b: OrderIdentity) { return a.orderRef === b.orderRef && a.manageToken === b.manageToken; }
export function workflowForOrder(order: OrderIdentity, snapshot: OrderSnapshot | null) {
  return snapshot && sameOrder(order, snapshot.order) ? snapshot.workflow : null;
}
export function parseOrderCommand(raw: string | null): OrderCommand | null {
  if (!raw) return null;
  const value = JSON.parse(raw) as OrderCommand;
  if (!value || typeof value.ref !== "string" || typeof value.requestId !== "string" || !value.requestId
    || !Number.isSafeInteger(value.version) || value.version < 0) throw new Error("The saved order action is invalid. Refresh the request status before trying again.");
  return value;
}
export function commandForOrder(order: OrderIdentity, command: OrderCommand | null) { return command?.ref === order.orderRef ? command : null; }

/** Call inside the session storage queue so the comparison and deletion stay together. */
export async function clearMatchingOrderCommand(expected: OrderCommand, read: () => Promise<string | null>, remove: () => Promise<void>) {
  const current = parseOrderCommand(await read());
  if (!current || current.ref !== expected.ref || current.requestId !== expected.requestId) return false;
  await remove();
  return true;
}
