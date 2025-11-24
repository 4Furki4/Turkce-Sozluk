import { Config, defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({
    path: ".env.production.local",
});

export default defineConfig({
    schema: "./db/schema/*.ts",
    dialect: "postgresql",
    dbCredentials: {
        // url: process.env.DATABASE_URL!,
        host: process.env.DATABASE_HOST!,
        port: Number(process.env.DATABASE_PORT),
        user: process.env.DATABASE_USERNAME!,
        password: process.env.DATABASE_PASSWORD!,
        database: process.env.DATABASE_DATABASE!,
        ssl: {
            ca: process.env.DATABASE_SSL_CA!,
        }
    },
    verbose: true,
    strict: true,
    out: "./drizzle/migrations",
    tablesFilter: ["!pg_stat_*"],
}) satisfies Config;
