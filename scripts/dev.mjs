import { spawn } from "node:child_process";
import path from "node:path";

const rootDir = process.cwd();
const nodeBin = process.execPath;

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

const collab = startProcess("collab", nodeBin, [
  collabEntry,
  "web-socket/collab.ts",
]);
const next = startProcess("next", nodeBin, [nextEntry, "dev"]);

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  collab.kill(signal);
  next.kill(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
