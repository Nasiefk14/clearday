import { execSync } from "node:child_process";
import { TEST_DATABASE_URL } from "./test-db";

// Apply migrations to the throwaway test database (in-memory in docker/CI). Tests clear their own rows.
export default function setup() {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}
