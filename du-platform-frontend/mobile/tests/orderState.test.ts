import { describe, expect, it, vi } from "vitest";
import { clearMatchingOrderCommand, commandForOrder, parseOrderCommand, workflowForOrder, type OrderSnapshot } from "../src/orderState";
import { sessionLifecycle } from "../src/sessionLifecycle";

const orderA = { orderRef: "DU-A", manageToken: "grant-A" };
const orderB = { orderRef: "DU-B", manageToken: "grant-B" };
const actionA = { ref: "DU-A", version: 4, requestId: "accept-A" };
const actionB = { ref: "DU-B", version: 8, requestId: "accept-B" };

describe("native order status identity", () => {
  it("does not render or offer acceptance of A's quote when B's status load fails", () => {
    const oldSnapshot: OrderSnapshot = { order: orderA, workflow: { stage: "quote_sent", version: 4, quoteExpired: false, nextAction: "Accept A" } };
    expect(workflowForOrder(orderA, oldSnapshot)?.version).toBe(4);
    // Even before effect cleanup, or if B never loads, A's old snapshot is unusable.
    expect(workflowForOrder(orderB, oldSnapshot)).toBeNull();
    expect(commandForOrder(orderB, actionA)).toBeNull();
    expect(workflowForOrder({ ...orderA, manageToken: "rotated-grant" }, oldSnapshot)).toBeNull();
  });

  it("retains the same request ID/version for a same-order retry", () => {
    const saved = parseOrderCommand(JSON.stringify(actionA));
    expect(commandForOrder(orderA, saved)).toEqual(actionA);
    expect(commandForOrder(orderB, saved)).toBeNull();
  });

  it.each([actionB, { ...actionA, requestId: "newer-accept-A" }])("late A acceptance cannot delete a newer pending action: %j", async newer => {
    let stored: string | null = JSON.stringify(newer);
    const remove = vi.fn(async () => { stored = null; });
    const lifecycle = sessionLifecycle();
    const removed = await lifecycle.storage(0, () => clearMatchingOrderCommand(actionA, async () => stored, remove));
    expect(removed).toBe(false);
    expect(remove).not.toHaveBeenCalled();
    expect(stored).toBe(JSON.stringify(newer));
  });

  it("clears only the confirmed matching order and command", async () => {
    let stored: string | null = JSON.stringify(actionA);
    await expect(clearMatchingOrderCommand(actionA, async () => stored, async () => { stored = null; })).resolves.toBe(true);
    expect(stored).toBeNull();
  });
});
