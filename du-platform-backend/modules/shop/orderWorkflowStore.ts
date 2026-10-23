import { queueOrderNotification } from "./orderOutboxStore";
import { recordShopFunnel } from "./funnel";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { db } from "../../shared/databaseRuntime";
import { sha256 } from "../../shared/persistence/authStore";
import {
  ShopRequestError,
  invalidateShopProductsCache,
  getShopOrderByRef,
} from "../../shared/persistence/shopStore";
import {
  orderCommandSchema,
  orderNextAction,
  permittedOrderTransition,
  type OrderStage,
  ORDER_STAGES,
} from "../../../shared/orderWorkflow";

function pool() {
  if (!db)
    throw new ShopRequestError("Order management requires the database.", 503);
  return db;
}
export async function ensureWorkflow(c: PoolConnection, order: RowDataPacket) {
  // Legacy paid orders already consumed stock; never deduct it again.
  await c.execute(
    `INSERT IGNORE INTO shop_order_workflows (order_id, stage, inventory_consumed) VALUES (?, ?, ?)`,
    [
      order.id,
      order.status === "paid"
        ? "payment_confirmed"
        : order.status === "failed"
          ? "cancelled"
          : "request_received",
      order.status === "paid",
    ]
  );
}
export async function readOrderWorkspace(ref: string, token?: string) {
  if (!db && token !== undefined) {
    const order = await getShopOrderByRef(ref, token);
    if (!order) throw new ShopRequestError("Order not found.", 404);
    const stage =
      order.status === "paid"
        ? "payment_confirmed"
        : order.status === "failed"
          ? "cancelled"
          : "request_received";
    return {
      stage,
      version: 0,
      quoteVersion: 0,
      quoteExpired: false,
      carrier: "",
      tracking: "",
      refundCents: 0,
      quotes: [],
      history: [],
      nextAction: orderNextAction(stage),
    };
  }
  const p = await pool().getConnection();
  try {
    await p.query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY");
    const [orders] = await p.query<RowDataPacket[]>(
      `SELECT * FROM shop_orders WHERE order_ref = ? ${token === undefined ? "" : "AND manage_token_hash = ?"}`,
      token === undefined ? [ref] : [ref, sha256(token)]
    );
    const order = orders[0];
    if (!order) throw new ShopRequestError("Order not found.", 404);
    const [
      [states],
      [items],
      [quotes],
      [events],
      [notifications],
      [snapshots],
      [refunds],
      [legacyRefunds],
    ] = await Promise.all([
      p.query<RowDataPacket[]>(
        "SELECT * FROM shop_order_workflows WHERE order_id = ?",
        [order.id]
      ),
      p.query<RowDataPacket[]>(
        "SELECT i.*,p.stock_qty AS current_stock,p.is_active AS currently_published FROM shop_order_items i LEFT JOIN shop_products p ON p.id=i.product_id WHERE i.order_id=? ORDER BY i.id",
        [order.id]
      ),
      p.query<RowDataPacket[]>(
        "SELECT *, valid_until <= NOW() AS expired FROM shop_quotes WHERE order_id = ? ORDER BY version",
        [order.id]
      ),
      p.query<RowDataPacket[]>(
        `SELECT ${token === undefined ? "*" : "action, public_message, created_at, CASE WHEN actor='customer' THEN request_id ELSE NULL END AS command_id"} FROM shop_order_events WHERE order_id = ? ORDER BY id`,
        [order.id]
      ),
      token === undefined
        ? p.query<RowDataPacket[]>(
            "SELECT id, event_key, status, attempts, error_message, accepted_at, first_attempt_at FROM shop_order_notifications WHERE order_id = ? ORDER BY id",
            [order.id]
          )
        : Promise.resolve([[]] as any),
      p.query<RowDataPacket[]>(
        "SELECT items FROM shop_order_snapshots WHERE order_id = ?",
        [order.id]
      ),
      p.query<RowDataPacket[]>(
        "SELECT * FROM shop_order_refunds WHERE order_id=? ORDER BY id",
        [order.id]
      ),
      p.query<RowDataPacket[]>(
        "SELECT * FROM shop_refund_legacy_balances WHERE order_id=?",
        [order.id]
      ),
    ]);
    const state = states[0] ?? {
      stage:
        order.status === "paid"
          ? "payment_confirmed"
          : order.status === "failed"
            ? "cancelled"
            : "request_received",
      version: 0,
      quote_version: 0,
    };
    const quote = quotes.at(-1);
    const stage = state.stage as OrderStage;
    const paymentReviewRequired = Boolean(
      state.payment_reference &&
        !state.inventory_consumed &&
        !["cancelled", "delivered"].includes(stage)
    );
    const publicState = {
      paymentReviewRequired,
      customerNotes: state.customer_notes ?? "",
      stage,
      version: state.version,
      quoteVersion: state.quote_version,
      quoteExpired: Boolean(quote?.expired),
      carrier: state.carrier || "",
      tracking: state.tracking || "",
      refundCents: state.refund_cents || 0,
      refundCurrency: quote?.currency || order.currency,
      remainingPaidCents:
        state.payment_reference && quote
          ? Math.max(
              0,
              Number(quote.total_cents) - Number(state.refund_cents || 0)
            )
          : null,
      unreconciledRefundCents: Math.max(
        0,
        Number(state.refund_cents || 0) -
          refunds.reduce((sum, r) => sum + Number(r.amount_cents), 0)
      ),
      nextAction: orderNextAction(stage, Boolean(quote?.expired)),
    };
    const parsedQuotes = quotes.map(q => ({
      ...q,
      items: JSON.parse(q.items),
    }));
    if (token !== undefined)
      return {
        ...publicState,
        refunds: refunds.map(r => ({
          amountCents: r.amount_cents,
          currency: r.currency,
          createdAt: r.created_at,
        })),
        quotes: parsedQuotes,
        estimate: {
          currency: order.currency,
          shippingCents: order.shipping_cents,
          totalCents: order.total_cents,
        },
        requestedItems: snapshots[0]
          ? JSON.parse(snapshots[0].items)
          : items.map(i => ({
              name: i.product_name,
              quantity: i.quantity,
              unitPriceCents: i.unit_price_cents,
            })),
        history: events.filter(
          e =>
            e.public_message ||
            ORDER_STAGES.includes(e.action) ||
            ["refund", "payment_issue"].includes(e.action)
        ),
      };
    const { manage_token_hash: _secret, ...safeOrder } = order;
    const { access_grant: _sealed, ...safeState } = state;
    return {
      order: safeOrder,
      state: { ...safeState, ...publicState },
      items,
      snapshots: snapshots[0] ? JSON.parse(snapshots[0].items) : null,
      quotes: parsedQuotes,
      history: events,
      notifications,
      refunds,
      legacyRefundBalance: legacyRefunds[0] || null,
    };
  } finally {
    try {
      await p.rollback();
    } finally {
      p.release();
    }
  }
}
export async function listOrderWorkspace(query: string, stage: string) {
  const q = `%${query.slice(0, 120)}%`;
  const [rows] = await pool().query<RowDataPacket[]>(
    `SELECT o.order_ref, o.customer_name, o.customer_email, o.created_at, o.currency, o.total_cents, COALESCE(w.stage, CASE WHEN o.status = 'paid' THEN 'payment_confirmed' WHEN o.status = 'failed' THEN 'cancelled' ELSE 'request_received' END) AS stage, w.assigned_to FROM shop_orders o LEFT JOIN shop_order_workflows w ON w.order_id=o.id WHERE (o.order_ref LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ?) HAVING (? = '' OR stage = ?) ORDER BY o.id DESC LIMIT 200`,
    [q, q, q, stage, stage]
  );
  return rows;
}
export async function applyOrderCommand(
  ref: string,
  input: unknown,
  actor: string,
  customerToken?: string
) {
  const cmd = orderCommandSchema.parse(input);
  const fingerprint = sha256(JSON.stringify(cmd));
  const c = await pool().getConnection();
  try {
    await c.beginTransaction();
    const [orders] = await c.query<RowDataPacket[]>(
      "SELECT * FROM shop_orders WHERE order_ref = ? FOR UPDATE",
      [ref]
    );
    const order = orders[0];
    if (
      !order ||
      (customerToken !== undefined &&
        order.manage_token_hash !== sha256(customerToken))
    )
      throw new ShopRequestError("Order not found.", 404);
    if (customerToken !== undefined && cmd.action !== "quote_accepted")
      throw new ShopRequestError("Customers can only accept a quote.", 403);
    await ensureWorkflow(c, order);
    const [rows] = await c.query<RowDataPacket[]>(
      "SELECT * FROM shop_order_workflows WHERE order_id = ? FOR UPDATE",
      [order.id]
    );
    const state = rows[0];
    const [existing] = await c.query<RowDataPacket[]>(
      "SELECT action,request_hash FROM shop_order_events WHERE order_id=? AND request_id=?",
      [order.id, cmd.requestId]
    );
    if (existing.length) {
      if (
        existing[0].action !== cmd.action ||
        (existing[0].request_hash && existing[0].request_hash !== fingerprint)
      )
        throw new ShopRequestError("This command was already used.", 409);
      await c.rollback();
      return readOrderWorkspace(ref, customerToken);
    }
    if (state.version !== cmd.version)
      throw new ShopRequestError(
        "Order changed. Reload before continuing.",
        409
      );
    if (
      state.payment_reference &&
      ["under_review", "quote_sent"].includes(cmd.action)
    )
      throw new ShopRequestError(
        "A received payment locks the agreed quote. Resolve fulfilment or record a refund and cancellation before a new request.",
        409
      );
    const auxiliary = [
      "note",
      "assign",
      "refund",
      "restock_return",
      "payment_issue",
    ].includes(cmd.action);
    if (
      !auxiliary &&
      !permittedOrderTransition(state.stage, cmd.action as OrderStage)
    )
      throw new ShopRequestError("This order transition is not allowed.", 409);
    const [items] = await c.query<RowDataPacket[]>(
      "SELECT * FROM shop_order_items WHERE order_id = ? ORDER BY id",
      [order.id]
    );
    const [quotes] = await c.query<RowDataPacket[]>(
      "SELECT *, valid_until <= NOW() AS expired FROM shop_quotes WHERE order_id=? AND version=?",
      [order.id, state.quote_version]
    );
    const quote = quotes[0];
    if (cmd.action === "quote_sent") {
      const q = cmd.quote;
      if (
        !q ||
        q.unitPrices.length !== items.length ||
        q.fulfilmentDetails?.length !== items.length ||
        new Date(q.validUntil).getTime() <= Date.now() ||
        new Date(q.validUntil).getTime() > Date.now() + 90 * 86400000
      )
        throw new ShopRequestError(
          "Provide a future quote validity date (within 90 days), a price and confirmed fulfilment details for each item."
        );
      const snapshot = items.map((item, i) => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPriceCents: q.unitPrices[i],
        lineTotalCents: q.unitPrices[i] * item.quantity,
        fulfilmentDetails: q.fulfilmentDetails![i],
      }));
      const total = snapshot.reduce(
        (n, item) => n + item.lineTotalCents,
        q.shippingCents
      );
      if (!Number.isSafeInteger(total) || total > 2147483647)
        throw new ShopRequestError("Quote total is too large.");
      await c.execute(
        "INSERT INTO shop_quotes (order_id,version,currency,items,shipping_cents,total_cents,valid_until) VALUES (?,?,?,?,?,?,?)",
        [
          order.id,
          state.quote_version + 1,
          q.currency,
          JSON.stringify(snapshot),
          q.shippingCents,
          total,
          new Date(q.validUntil),
        ]
      );
      state.quote_version++;
    }
    if (cmd.action === "quote_accepted" && (!quote || quote.expired))
      throw new ShopRequestError(
        "The quote has expired or is missing. Request a revised quote.",
        409
      );
    if (cmd.action === "payment_issue") {
      if (
        state.stage !== "quote_accepted" ||
        state.payment_reference ||
        !quote ||
        !cmd.paymentReference ||
        !cmd.note
      )
        throw new ShopRequestError(
          "Record the received full payment reference and explain the stock issue for an accepted quote.",
          409
        );
      state.payment_reference = cmd.paymentReference;
      await c.execute(
        "UPDATE shop_orders SET status='paid',payment_reference=? WHERE id=?",
        [cmd.paymentReference, order.id]
      );
    }
    if (cmd.action === "payment_confirmed") {
      if (!cmd.paymentReference || !quote)
        throw new ShopRequestError(
          "An accepted quote and payment reference are required."
        );
      if (state.inventory_consumed)
        throw new ShopRequestError("Inventory was already consumed.", 409);
      if (
        state.payment_reference &&
        state.payment_reference !== cmd.paymentReference
      )
        throw new ShopRequestError(
          "Use the existing received payment reference.",
          409
        );
      if (quote.total_cents > 0 && state.refund_cents >= quote.total_cents)
        throw new ShopRequestError(
          "A fully refunded request cannot consume stock.",
          409
        );
      // Stable row order avoids deadlocks; conditional updates arbitrate concurrent orders.
      for (const item of [...items].sort(
        (a, b) => a.product_id - b.product_id
      )) {
        const [result] = await c.execute<any>(
          "UPDATE shop_products SET stock_qty=stock_qty-? WHERE id=? AND is_active=1 AND stock_qty>=?",
          [item.quantity, item.product_id, item.quantity]
        );
        if (!result.affectedRows)
          throw new ShopRequestError(
            `Item ${item.product_name} is unavailable. Resolve the quote before recording payment.`,
            409
          );
      }
      state.inventory_consumed = 1;
      state.payment_reference = cmd.paymentReference;
      await c.execute(
        "UPDATE shop_orders SET status='paid', payment_reference=? WHERE id=?",
        [cmd.paymentReference, order.id]
      );
    }
    if (cmd.action === "dispatched") {
      if (
        quote &&
        quote.total_cents > 0 &&
        state.refund_cents >= quote.total_cents
      )
        throw new ShopRequestError(
          "A fully refunded order cannot be dispatched.",
          409
        );
      if (!cmd.carrier || !cmd.tracking)
        throw new ShopRequestError(
          "Carrier and tracking reference are required."
        );
      state.carrier = cmd.carrier;
      state.tracking = cmd.tracking;
    }
    if (cmd.action === "cancelled") {
      if (!cmd.note)
        throw new ShopRequestError(
          "Record the cancellation reason, including any unavailable items."
        );
      if (state.inventory_consumed && cmd.restock === undefined)
        throw new ShopRequestError(
          "Explicitly decide whether the goods can return to available stock."
        );
      if (state.inventory_consumed && cmd.restock)
        for (const item of items)
          await c.execute(
            "UPDATE shop_products SET stock_qty=stock_qty+? WHERE id=?",
            [item.quantity, item.product_id]
          );
      if (cmd.restock) state.inventory_consumed = 0;
    }
    if (cmd.action === "restock_return") {
      if (
        !state.inventory_consumed ||
        !["cancelled", "dispatched", "delivered"].includes(state.stage) ||
        !cmd.note
      )
        throw new ShopRequestError(
          "Record checked returned goods and a note before restocking.",
          409
        );
      for (const item of items)
        await c.execute(
          "UPDATE shop_products SET stock_qty=stock_qty+? WHERE id=?",
          [item.quantity, item.product_id]
        );
      state.inventory_consumed = 0;
    }
    if (cmd.action === "refund") {
      if (
        !state.payment_reference ||
        !cmd.refundCents ||
        !cmd.refundReference ||
        !quote ||
        state.refund_cents + cmd.refundCents > quote.total_cents
      )
        throw new ShopRequestError(
          "Record an actual refund reference and amount within the paid quote total."
        );
      const [legacy] = await c.query<RowDataPacket[]>(
        "SELECT order_id FROM shop_refund_legacy_balances WHERE order_id=? AND BINARY last_known_reference=BINARY ?",
        [order.id, cmd.refundReference]
      );
      if (legacy.length)
        throw new ShopRequestError(
          "This reference matches an unreconciled historical refund. Reconcile it before recording another refund.",
          409
        );
      state.refund_cents += cmd.refundCents;
      state.refund_reference = cmd.refundReference;
      try {
        await c.execute(
          "INSERT INTO shop_order_refunds (order_id,command_id,amount_cents,currency,external_reference,reference_provider,reference_hash,actor) VALUES (?,?,?,?,?,?,?,?)",
          [
            order.id,
            cmd.requestId,
            cmd.refundCents,
            quote.currency,
            cmd.refundReference,
            (cmd.refundProvider || "manual").toLowerCase(),
            sha256(cmd.refundReference),
            actor,
          ]
        );
      } catch (err: any) {
        if (err.code === "ER_DUP_ENTRY")
          throw new ShopRequestError(
            "This refund reference is already recorded for this order and payment channel. Reconcile the existing record before another refund.",
            409
          );
        throw err;
      }
    }
    if (cmd.action === "assign") {
      if (!cmd.assignedTo)
        throw new ShopRequestError("An operator email is required.");
      state.assigned_to = cmd.assignedTo;
    }
    if (cmd.action === "note" && !cmd.note)
      throw new ShopRequestError("Enter an internal note.");
    const stage = auxiliary ? state.stage : cmd.action;
    await c.execute(
      `UPDATE shop_order_workflows SET stage=?, version=version+1, quote_version=?, assigned_to=?, inventory_consumed=?, payment_reference=?, carrier=?, tracking=?, refund_cents=?, refund_reference=? WHERE order_id=?`,
      [
        stage,
        state.quote_version,
        state.assigned_to,
        state.inventory_consumed,
        state.payment_reference,
        state.carrier,
        state.tracking,
        state.refund_cents,
        state.refund_reference,
        order.id,
      ]
    );
    await c.execute(
      "INSERT INTO shop_order_events (order_id,request_id,action,actor,note,public_message,request_hash) VALUES (?,?,?,?,?,?,?)",
      [
        order.id,
        cmd.requestId,
        cmd.action,
        customerToken === undefined ? actor : "customer",
        cmd.note,
        cmd.publicMessage,
        fingerprint,
      ]
    );
    if (
      !auxiliary ||
      cmd.action === "refund" ||
      cmd.action === "payment_issue" ||
      cmd.publicMessage
    )
      await queueOrderNotification(
        c,
        order.id,
        `${state.version + 1}:${cmd.action}`,
        state.language,
        cmd.publicMessage
      );
    if (
      state.analytics_consent &&
      (cmd.action === "quote_sent" || cmd.action === "delivered")
    )
      await recordShopFunnel(
        c,
        cmd.action === "delivered" ? "fulfilled" : "quote_sent"
      );
    await c.commit();
    invalidateShopProductsCache();
    return readOrderWorkspace(ref, customerToken);
  } catch (err) {
    await c.rollback();
    throw err;
  } finally {
    c.release();
  }
}
