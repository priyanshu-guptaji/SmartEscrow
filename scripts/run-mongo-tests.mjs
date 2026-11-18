#!/usr/bin/env node
/**
 * Run the MongoDB integration suite against a disposable MongoDB container.
 *
 *   npm run test:db:mongo:docker
 *
 * Startup, readiness polling and teardown are handled here so the whole check
 * is one command. Override the image with MONGO_IMAGE (default: mongo:7) or the
 * database name with MONGODB_TEST_DB (default: smartescrow_test).
 *
 * If you already have a MongoDB instance, skip Docker entirely:
 *   MONGODB_TEST_URI=mongodb://host:27017/db npm run test:db:mongo
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";

const IMAGE = process.env.MONGO_IMAGE || "mongo:7";
const DATABASE = process.env.MONGODB_TEST_DB || "smartescrow_test";
const CONTAINER = `smartescrow-mongo-test-${process.pid}`;
const TEST_FILE = "test/db.mongo.test.ts";

let startedContainer = false;

function log(message) {
  console.log(`[mongo-test] ${message}`);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (port === null) reject(new Error("Could not allocate a local port"));
        else resolve(port);
      });
    });
  });
}

function dockerAvailable() {
  return run("docker", ["info"], { stdio: "ignore" }).status === 0;
}

function containerReady() {
  const result = run(
    "docker",
    ["exec", CONTAINER, "mongosh", "--quiet", "--eval", "db.runCommand({ping:1}).ok"],
    { timeout: 15_000 }
  );
  return result.status === 0 && (result.stdout || "").trim() === "1";
}

function stopContainer() {
  if (!startedContainer) return;
  startedContainer = false;
  log("Stopping the MongoDB container...");

  const result = run("docker", ["stop", CONTAINER], { stdio: "ignore", timeout: 60_000 });
  if (result.status !== 0) {
    // It may already be gone because the container was started with --rm.
    run("docker", ["rm", "-f", CONTAINER], { stdio: "ignore", timeout: 60_000 });
  }
}

function findTestRunner() {
  const localCli = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  if (existsSync(localCli)) {
    return { command: process.execPath, args: [localCli, TEST_FILE] };
  }
  return { command: "npx", args: ["tsx", TEST_FILE], shell: process.platform === "win32" };
}

async function main() {
  if (process.env.MONGODB_TEST_URI) {
    log("MONGODB_TEST_URI is set; skipping the container and using that instance.");
    return runTests(process.env.MONGODB_TEST_URI);
  }

  if (!dockerAvailable()) {
    console.error(
      "[mongo-test] Docker is not available. Start Docker Desktop, or run:\n" +
        "  MONGODB_TEST_URI=mongodb://host:27017/smartescrow_test npm run test:db:mongo"
    );
    return 1;
  }

  const port = await getFreePort();
  const uri = `mongodb://127.0.0.1:${port}/${DATABASE}`;

  log(`Starting disposable MongoDB container (${IMAGE}) as ${CONTAINER} on port ${port}...`);
  const start = run("docker", [
    "run",
    "-d",
    "--rm",
    "--name",
    CONTAINER,
    "-p",
    `127.0.0.1:${port}:27017`,
    IMAGE,
  ]);

  if (start.status !== 0) {
    console.error("[mongo-test] Failed to start the MongoDB container.");
    if (start.stderr) console.error(start.stderr.trim());
    return 1;
  }

  startedContainer = true;

  log("Waiting for MongoDB to accept connections...");
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (containerReady()) break;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  if (!containerReady()) {
    console.error("[mongo-test] MongoDB did not become ready within 60s.");
    const logs = run("docker", ["logs", "--tail", "30", CONTAINER]);
    if (logs.stdout) console.error(logs.stdout.trim());
    return 1;
  }

  log("MongoDB is ready. Running the integration suite...");
  return runTests(uri);
}

function runTests(uri) {
  const runner = findTestRunner();
  const child = spawn(runner.command, runner.args, {
    stdio: "inherit",
    shell: runner.shell ?? false,
    env: { ...process.env, MONGODB_TEST_URI: uri },
  });

  return new Promise((resolve) => {
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", (error) => {
      console.error("[mongo-test] Failed to start the test runner:", error.message);
      resolve(1);
    });
  });
}

let finished = false;

async function cleanupAndExit(code) {
  if (finished) return;
  finished = true;
  stopContainer();
  process.exit(code);
}

process.on("SIGINT", () => {
  log("Interrupted.");
  cleanupAndExit(130);
});
process.on("SIGTERM", () => {
  cleanupAndExit(143);
});

let exitCode = 1;
try {
  exitCode = await main();
} catch (error) {
  console.error("[mongo-test]", error instanceof Error ? error.message : error);
} finally {
  if (!finished) {
    stopContainer();
    finished = true;
  }
}

process.exit(exitCode);
