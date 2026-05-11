import { createServer } from "http";
import next from "next";
import { registerSocketServer } from "./socket";
import { initializeCollabServer } from "./socket/collab/collab.server";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

async function bootstrap() {
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
