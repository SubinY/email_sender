import type { Config } from 'drizzle-kit';
import { loadEnvConfig } from '@next/env';

// 加载环境变量
loadEnvConfig(process.cwd());

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config; 