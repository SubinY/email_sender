import * as schema from './schema';

// 延迟初始化数据库连接
let db: any = null;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/email_system';

function getDatabase() {
  if (db) return db;

  // 生产环境使用 Neon，开发环境使用本地 PostgreSQL
  if (process.env.NODE_ENV === 'production' || DATABASE_URL.includes('neon')) {
    // Neon Database 连接 - 专为 Serverless 优化
    const { drizzle } = require('drizzle-orm/neon-http');
    const { neon } = require('@neondatabase/serverless');
    
    const sql = neon(DATABASE_URL);
    db = drizzle(sql, {
      schema,
      logger: process.env.NODE_ENV === 'development'
    });
  } else {
    // 本地开发环境使用 postgres-js
    const { drizzle } = require('drizzle-orm/postgres-js');
    const postgres = require('postgres');
    
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
  }

  return db;
}

export { getDatabase };

// 为了向后兼容，保留 db 导出
export default getDatabase();