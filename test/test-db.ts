import "dotenv/config";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://clearday:clearday@localhost:5435/clearday_test";

if (!/_test\b/.test(TEST_DATABASE_URL)) throw new Error("Refusing to run integration tests against a non-test database");
