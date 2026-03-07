import type mysql from "mysql2/promise";
import { db, isDbConnectionError } from "../databaseRuntime";

export const ntirSeedEntities: Array<{
  id: number;
  name: string;
  sector: string;
  location: string;
  verification_status: "Verified" | "Pending";
}> = [
  { id: 1, name: "Mosi Oa Tunya Development Company", sector: "Tourism & Infrastructure", location: "Matabeleland North", verification_status: "Verified" },
  { id: 2, name: "Agro Strong (Pvt) Ltd", sector: "Agriculture", location: "Matabeleland South", verification_status: "Verified" },
  { id: 3, name: "Goromonzi Agro Industrial Company (GAIC)", sector: "Agriculture", location: "Mashonaland East", verification_status: "Verified" },
  { id: 4, name: "Cicada Group", sector: "Agriculture", location: "Midlands / Manicaland", verification_status: "Verified" },
  { id: 5, name: "Misty Mountains Coffee Company", sector: "Agriculture", location: "Manicaland", verification_status: "Pending" },
  { id: 6, name: "Fairway (Pvt) Ltd", sector: "Agriculture", location: "Manicaland", verification_status: "Pending" },
  { id: 7, name: "Powertel Communications (Pvt) Ltd", sector: "ICT", location: "Harare", verification_status: "Verified" },
  { id: 8, name: "TelOne (Pvt) Ltd", sector: "ICT", location: "Harare", verification_status: "Verified" },
  { id: 9, name: "Linkdef Soap Manufacturing (Pvt) Ltd", sector: "Manufacturing", location: "Harare", verification_status: "Pending" },
  { id: 10, name: "National Railways of Zimbabwe", sector: "Manufacturing", location: "Bulawayo", verification_status: "Verified" },
  { id: 11, name: "Solgas Energy Pvt Ltd", sector: "Renewable Energy", location: "Matabeleland North", verification_status: "Verified" },
  { id: 12, name: "RADCO Holdings", sector: "Renewable Energy", location: "Mashonaland Central", verification_status: "Pending" },
  { id: 13, name: "SIRDC", sector: "Biotech Manufacturing", location: "Harare", verification_status: "Verified" },
  { id: 14, name: "Orangerose Investments", sector: "Clean-Tech Manufacturing", location: "Harare", verification_status: "Pending" },
  { id: 15, name: "Mining Promotion Corporation", sector: "Mining", location: "Matabeleland South", verification_status: "Pending" },
  { id: 16, name: "Sunway City (Pvt) Ltd", sector: "Urban Infrastructure", location: "Harare", verification_status: "Pending" },
];

export async function searchNtirEntities(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!db) {
    if (!normalizedQuery) return ntirSeedEntities;
    return ntirSeedEntities.filter((entity) =>
      [entity.name, entity.sector, entity.location].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }

  if (!normalizedQuery) {
    try {
      const [rows] = await db.query<mysql.RowDataPacket[]>(
        "SELECT id, name, sector, location, verification_status FROM ntir_entities ORDER BY id DESC LIMIT 50"
      );
      return rows;
    } catch (error) {
      if (!isDbConnectionError(error)) throw error;
      return ntirSeedEntities;
    }
  }

  const likeQuery = `%${normalizedQuery}%`;
  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `
      SELECT id, name, sector, location, verification_status
      FROM ntir_entities
      WHERE LOWER(name) LIKE ? OR LOWER(sector) LIKE ? OR LOWER(location) LIKE ?
      ORDER BY id DESC
      LIMIT 50
      `,
      [likeQuery, likeQuery, likeQuery]
    );
    return rows;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return ntirSeedEntities.filter((entity) =>
      [entity.name, entity.sector, entity.location].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }
}

export async function getNtirEntities() {
  if (!db) {
    return [...ntirSeedEntities].sort((left, right) => right.id - left.id);
  }

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, name, sector, location, verification_status FROM ntir_entities ORDER BY id DESC LIMIT 500"
    );
    return rows;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return [...ntirSeedEntities].sort((left, right) => right.id - left.id);
  }
}

export async function createNtirEntity(
  name: string,
  sector: string,
  location: string,
  verificationStatus: "Verified" | "Pending"
) {
  if (!db) {
    const record = {
      id: ntirSeedEntities.length + 1,
      name,
      sector,
      location,
      verification_status: verificationStatus,
    };
    ntirSeedEntities.unshift(record);
    return record;
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>(
      "INSERT INTO ntir_entities (name, sector, location, verification_status) VALUES (?, ?, ?, ?)",
      [name, sector, location, verificationStatus]
    );
    return {
      id: result.insertId,
      name,
      sector,
      location,
      verification_status: verificationStatus,
    };
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const record = {
      id: ntirSeedEntities.length + 1,
      name,
      sector,
      location,
      verification_status: verificationStatus,
    };
    ntirSeedEntities.unshift(record);
    return record;
  }
}

export async function updateNtirEntity(
  id: number,
  payload: Partial<{
    name: string;
    sector: string;
    location: string;
    verification_status: "Verified" | "Pending";
  }>
) {
  if (!db) {
    const index = ntirSeedEntities.findIndex((item) => item.id === id);
    if (index < 0) return null;
    ntirSeedEntities[index] = { ...ntirSeedEntities[index], ...payload };
    return ntirSeedEntities[index];
  }

  try {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (payload.name !== undefined) {
      updates.push("name = ?");
      params.push(payload.name);
    }
    if (payload.sector !== undefined) {
      updates.push("sector = ?");
      params.push(payload.sector);
    }
    if (payload.location !== undefined) {
      updates.push("location = ?");
      params.push(payload.location);
    }
    if (payload.verification_status !== undefined) {
      updates.push("verification_status = ?");
      params.push(payload.verification_status);
    }
    if (updates.length === 0) return null;

    params.push(id);
    await db.execute(`UPDATE ntir_entities SET ${updates.join(", ")} WHERE id = ?`, params);
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, name, sector, location, verification_status FROM ntir_entities WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const index = ntirSeedEntities.findIndex((item) => item.id === id);
    if (index < 0) return null;
    ntirSeedEntities[index] = { ...ntirSeedEntities[index], ...payload };
    return ntirSeedEntities[index];
  }
}
