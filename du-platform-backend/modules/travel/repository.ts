import { randomUUID } from "node:crypto";
import type { Pool } from "mysql2/promise";
import {
  savedTravelSchema,
  type SavedTravelInput,
  type SavedTravel,
} from "../../../shared/travel";
export class TravelRepository {
  constructor(private pool: Pool) {}
  async list(owner: number): Promise<SavedTravel[]> {
    const [rows] = await this.pool.query<any[]>(
      "SELECT id,name,kind,draft,updated_at FROM travel_saved WHERE user_id=? ORDER BY updated_at DESC,id LIMIT 30",
      [owner]
    );
    return rows.map(r => ({
      id: r.id,
      ...savedTravelSchema.parse({
        name: r.name,
        kind: r.kind,
        draft: typeof r.draft === "string" ? JSON.parse(r.draft) : r.draft,
      }),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  }
  async save(owner: number, input: SavedTravelInput) {
    const c = await this.pool.getConnection();
    try {
      await c.beginTransaction();
      // Serialize per-account saves, including the empty collection case.
      await c.query("SELECT id FROM users WHERE id=? FOR UPDATE", [owner]);
      const [rows] = await c.query<any[]>(
        "SELECT COUNT(*) AS total FROM travel_saved WHERE user_id=?",
        [owner]
      );
      if (Number(rows[0].total) >= 30) throw new Error("TRAVEL_LIMIT");
      const id = randomUUID();
      await c.execute(
        "INSERT INTO travel_saved (id,user_id,name,kind,draft) VALUES (?,?,?,?,?)",
        [id, owner, input.name, input.kind, JSON.stringify(input.draft)]
      );
      await c.commit();
      return id;
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  }
  async remove(owner: number, id: string) {
    const [result] = await this.pool.execute<any>(
      "DELETE FROM travel_saved WHERE user_id=? AND id=?",
      [owner, id]
    );
    return result.affectedRows > 0;
  }
}
