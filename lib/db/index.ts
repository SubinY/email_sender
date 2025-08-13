import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 延迟初始化数据库连接
let db: ReturnType<typeof drizzle> | null = null;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/email_system';

function getDatabase() {
  if (db) return db;

  const client = postgres(DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    debug: process.env.NODE_ENV === 'development',
  });

  db = drizzle(client, {
    schema,
    logger: process.env.NODE_ENV === 'development'
  });

  return db;
}

export { getDatabase };

// 为了向后兼容，保留 db 导出
export default getDatabase();