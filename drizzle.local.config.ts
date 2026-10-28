import { Config, defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({
    path: ".env.local",
});
export default defineConfig({
    schema: "./db/schema/*.ts",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
        ssl: new URL(process.env.DATABASE_URL!).searchParams.get("sslmode") === "disable" ? false : true,
    },
    verbose: true,
    strict: true,
    out: "./drizzle/migrations",
}) satisfies Config;
