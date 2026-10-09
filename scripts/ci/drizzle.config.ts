import { defineConfig } from "drizzle-kit";
import { ciEnvironment } from "./env.mjs";

export default defineConfig({
  schema: "./db/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: { url: ciEnvironment().DATABASE_URL },
});
