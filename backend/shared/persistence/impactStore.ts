import type mysql from "mysql2/promise";
import { db, isDbConnectionError } from "../databaseRuntime";

const memorySuccessStories: Array<{
  id: number;
  title: string;
  category: string;
  image: string;
  story: string;
  testimonial: string;
  author: string;
  role: string;
  revenue: string;
  jobs: string;
  markets: string;
  is_published: 0 | 1;
  created_at: string;
}> = [];

export async function getSuccessStories(includeUnpublished = false) {
  if (!db) {
    const rows = includeUnpublished
      ? memorySuccessStories
      : memorySuccessStories.filter((story) => story.is_published === 1);
    return [...rows].sort((left, right) => right.id - left.id);
  }

  try {
    const query = includeUnpublished
      ? "SELECT * FROM success_stories ORDER BY id DESC LIMIT 500"
      : "SELECT * FROM success_stories WHERE is_published = 1 ORDER BY id DESC LIMIT 500";
    const [rows] = await db.query<mysql.RowDataPacket[]>(query);
    return rows;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const rows = includeUnpublished
      ? memorySuccessStories
      : memorySuccessStories.filter((story) => story.is_published === 1);
    return [...rows].sort((left, right) => right.id - left.id);
  }
}

export async function createSuccessStory(payload: {
  title: string;
  category: string;
  image: string;
  story: string;
  testimonial: string;
  author: string;
  role: string;
  revenue: string;
  jobs: string;
  markets: string;
  is_published: 0 | 1;
}) {
  if (!db) {
    const record = {
      id: memorySuccessStories.length + 1,
      ...payload,
      created_at: new Date().toISOString(),
    };
    memorySuccessStories.unshift(record);
    return record;
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>(
      `
      INSERT INTO success_stories
      (title, category, image, story, testimonial, author, role, revenue, jobs, markets, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.title,
        payload.category,
        payload.image,
        payload.story,
        payload.testimonial,
        payload.author,
        payload.role,
        payload.revenue,
        payload.jobs,
        payload.markets,
        payload.is_published,
      ]
    );
    const [rows] = await db.query<mysql.RowDataPacket[]>("SELECT * FROM success_stories WHERE id = ? LIMIT 1", [
      result.insertId,
    ]);
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const record = {
      id: memorySuccessStories.length + 1,
      ...payload,
      created_at: new Date().toISOString(),
    };
    memorySuccessStories.unshift(record);
    return record;
  }
}

export async function updateSuccessStory(
  id: number,
  payload: {
    title?: string;
    category?: string;
    image?: string;
    story?: string;
    testimonial?: string;
    author?: string;
    role?: string;
    revenue?: string;
    jobs?: string;
    markets?: string;
    is_published?: 0 | 1;
  }
) {
  if (!db) {
    const index = memorySuccessStories.findIndex((item) => item.id === id);
    if (index < 0) return null;
    memorySuccessStories[index] = { ...memorySuccessStories[index], ...payload };
    return memorySuccessStories[index];
  }

  try {
    const updates: string[] = [];
    const params: unknown[] = [];
    const pushIf = (key: keyof typeof payload) => {
      if (payload[key] === undefined) return;
      updates.push(`${String(key)} = ?`);
      params.push(payload[key]);
    };

    pushIf("title");
    pushIf("category");
    pushIf("image");
    pushIf("story");
    pushIf("testimonial");
    pushIf("author");
    pushIf("role");
    pushIf("revenue");
    pushIf("jobs");
    pushIf("markets");
    pushIf("is_published");

    if (updates.length === 0) return null;

    params.push(id);
    await db.execute(`UPDATE success_stories SET ${updates.join(", ")} WHERE id = ?`, params);
    const [rows] = await db.query<mysql.RowDataPacket[]>("SELECT * FROM success_stories WHERE id = ? LIMIT 1", [id]);
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const index = memorySuccessStories.findIndex((item) => item.id === id);
    if (index < 0) return null;
    memorySuccessStories[index] = { ...memorySuccessStories[index], ...payload };
    return memorySuccessStories[index];
  }
}
