import { spawn } from "node:child_process";
import path from "node:path";

const rootDir = process.cwd();
const nodeBin = process.execPath;
const collabHealthUrl = "http://127.0.0.1:1234/health";

const collabEntry = path.join(
  rootDir,
  "node_modules",
  "ts-node",
  "dist",
  "bin.js",
);
const nextEntry = path.join(
  rootDir,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

let shuttingDown = false;

function startProcess(name, command, args) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    if (signal) {
      console.log(`${name} exited with signal ${signal}`);
    } else if (typeof code === "number" && code !== 0) {
      console.log(`${name} exited with code ${code}`);
    }

    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.error(`Failed to start ${name}:`, error);
    process.exit(1);
  });

  return child;
}

async function waitForCollabServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(collabHealthUrl, { cache: "no-store" });
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore connection errors while the server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error("Collaboration server did not become ready in time");
}

const collab = startProcess("collab", nodeBin, [collabEntry, "web-socket/collab.ts"]);
let next = null;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  collab.kill(signal);
  next?.kill(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

try {
  await waitForCollabServer();
  next = startProcess("next", nodeBin, [nextEntry, "dev"]);
} catch (error) {
  shuttingDown = true;
  collab.kill("SIGTERM");
  console.error(error);
  process.exit(1);
}
