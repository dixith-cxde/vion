import { loadEnvConfig } from "@next/env";
import { createServer } from "http";

const projectDir = process.cwd();
const dev = process.env.NODE_ENV !== "production";

loadEnvConfig(projectDir, dev);

const hostname = process.env.HOSTNAME ?? "localhost";
const port = Number(process.env.PORT ?? 3000);

async function bootstrap() {
  const [{ default: next }, { registerSocketServer }, { initializeCollabServer }] =
    await Promise.all([
      import("next"),
      import("./socket"),
      import("./socket/collab/collab.server"),
    ]);

  const app = next({
    dev,
    hostname,
    port,
  });

  const handler = app.getRequestHandler();

  await app.prepare();

  const httpServer = createServer((req, res) => {
    handler(req, res);
  });

  registerSocketServer(httpServer);

  initializeCollabServer(httpServer);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Server bootstrap failed:", error);

  process.exit(1);
});
