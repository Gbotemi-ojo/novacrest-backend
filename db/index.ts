import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import pg from "pg";
import "dotenv/config"
const dbCredentials={
    // host: process.env.DB_HOST,
    // port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
    // database: process.env.DB_NAME,
    // dialect: process.env.DB_DIALECT,
    // user: process.env.DB_USER,
    // password: process.env.DB_PASS,
    // ssl:process.env.DB_SSL=="true"?true:false
    url : 'postgresql://postgres.aatktzqdrxfshlgjskzo:thefutureofcoding@aws-0-us-east-2.pooler.supabase.com:5432/postgres'
}

const client = new pg.Client(dbCredentials.url)

async function connectAndInitialize() {
    await client.connect()
    const db = drizzle(client, { schema, logger: true })
    return db
}

const db = connectAndInitialize()
export default db