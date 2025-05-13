import { defineConfig } from 'drizzle-kit';
import "dotenv/config";
console.log("DB URL:", process.env.DB_URL);
export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migration',
  dialect: 'postgresql', // 'postgresql' | 'mysql' | 'sqlite'
  // driver: "pg",
  dbCredentials: {
    // host: process.env.DB_HOST as string,
    // port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    // database: process.env.DB_NAME as string,
    // user: process.env.DB_USER as string,
    // password: process.env.DB_PASS as string,
    // ssl : process.env.DB_SSL=="true"?true:false,
    // url : process.env.DB_URL as string
    url : 'postgresql://postgres.aatktzqdrxfshlgjskzo:thefutureofcoding@aws-0-us-east-2.pooler.supabase.com:5432/postgres'
  },
  verbose:true,
  strict:true
});
