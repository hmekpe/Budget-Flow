const { spawn } = require("child_process");
const fs = require("fs");
const net = require("net");
const path = require("path");
const readline = require("readline");

const ROOT_DIR = __dirname;

function resolveBunBin() {
  const candidates = [
    process.env.BUN_BIN,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, ".bun", "bin", "bun.exe") : "",
    process.execPath
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || process.execPath;
}

const BUN_BIN = resolveBunBin();

const SERVICES = [
  {
    name: "auth",
    color: "\x1b[36m",
    cwd: path.join(ROOT_DIR, "Budget-Flow", "backend"),
    args: ["run", "start"],
    port: 5000
  },
  {
    name: "feature",
    color: "\x1b[33m",
    cwd: path.join(ROOT_DIR, "budget-flow-unified-backend"),
    args: ["run", "start"],
    port: 5002
  },
  {
    name: "frontend",
    color: "\x1b[32m",
    cwd: ROOT_DIR,
    args: ["serve-frontends.js"],
    port: 5500
  }
];

const RESET = "\x1b[0m";
const children = [];
let isShuttingDown = false;

function prefixLine(service, line) {
  if (!line) {
    return;
  }

  const label = `${service.color}[${service.name}]${RESET}`;
  process.stdout.write(`${label} ${line}\n`);
}

function attachOutput(service, stream) {
  const reader = readline.createInterface({ input: stream });
  reader.on("line", (line) => prefixLine(service, line));
}

function killChildTree(child) {
  if (!child || child.exitCode !== null || child.pid == null) {
    return Promise.resolve();
  }

  if (process.platform === "win32") {
    return new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore"
      });

      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });
  }

  return new Promise((resolve) => {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
    resolve();
  });
}

async function shutdownAll(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  process.stdout.write("\nStopping Budget Flow workflow...\n");
  await Promise.all(children.map((child) => killChildTree(child.process)));
  process.exit(exitCode);
}

function ensurePortAvailable(service) {
  return new Promise((resolve, reject) => {
    const tester = net
      .createServer()
      .once("error", (error) => {
        if (error.code === "EADDRINUSE") {
          reject(
            new Error(
              `Port ${service.port} is already in use. Stop the existing process before starting the ${service.name} service.`
            )
          );
          return;
        }

        reject(error);
      })
      .once("listening", () => {
        tester.close(resolve);
      });

    tester.listen(service.port, "127.0.0.1");
  });
}

function startService(service) {
  const child = spawn(BUN_BIN, service.args, {
    cwd: service.cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32"
  });

  attachOutput(service, child.stdout);
  attachOutput(service, child.stderr);

  child.on("error", (error) => {
    prefixLine(service, `Failed to start: ${error.message}`);
    shutdownAll(1);
  });

  child.on("exit", (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    const reason =
      signal !== null ? `signal ${signal}` : `exit code ${typeof code === "number" ? code : "unknown"}`;
    prefixLine(service, `Stopped unexpectedly with ${reason}`);
    shutdownAll(typeof code === "number" ? code : 1);
  });

  children.push({ service, process: child });
  prefixLine(service, `Started in ${service.cwd}`);
}

process.on("SIGINT", () => {
  shutdownAll(0);
});

process.on("SIGTERM", () => {
  shutdownAll(0);
});

process.on("uncaughtException", (error) => {
  process.stderr.write(`\n[launcher] ${error.stack || error.message}\n`);
  shutdownAll(1);
});

async function main() {
  process.stdout.write("Starting Budget Flow workflow...\n");

  try {
    for (const service of SERVICES) {
      await ensurePortAvailable(service);
    }
  } catch (error) {
    process.stderr.write(`[launcher] ${error.message}\n`);
    process.exit(1);
  }

  SERVICES.forEach(startService);
  process.stdout.write("Workflow URLs:\n");
  process.stdout.write("- Auth: http://localhost:5500/pages/auth.html\n");
  process.stdout.write("- App:  http://localhost:5500/app/index.html#dashboard\n");
  process.stdout.write("Press Ctrl+C to stop all services.\n");
}

main();
