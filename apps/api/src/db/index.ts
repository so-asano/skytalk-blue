import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL!;
const isProduction = process.env.NODE_ENV === "production";

const client = postgres(connectionString, {
  ssl: isProduction ? "require" : false,
});
export const db = drizzle(client, { schema });
