import type mysql from 'mysql2/promise';
import { db } from '../db';

export async function withTransaction<T>(work: (connection: mysql.PoolConnection | null) => Promise<T>): Promise<T> {
  if (!db) return work(null);

  const connection = await db.getConnection();
  try {
    await connection.query('START TRANSACTION');
    const result = await work(connection);
    await connection.query('COMMIT');
    return result;
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
}
