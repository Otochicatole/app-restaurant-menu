import { spawn } from "node:child_process";
import { prepareDisposableTestDatabase } from "./require-test-database";

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) {
  console.error("TEST_DATABASE_URL is required by check:ci.");
  process.exit(1);
}

const commands = ["check", "test:coverage", "test:integration", "test:e2e"] as const;
const testDatabase = await prepareDisposableTestDatabase(testDatabaseUrl);
const environment = {
  ...process.env,
  DATABASE_URL: testDatabase.connectionString,
  TEST_DATABASE_URL: testDatabase.connectionString,
};

for (const command of commands) {
  console.log(`\n> bun run ${command}`);
  const exitCode = await run(["run", command]);
  if (exitCode !== 0) process.exit(exitCode ?? 1);
}

function run(arguments_: string[]): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, arguments_, {
      env: environment,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", resolve);
  });
}
