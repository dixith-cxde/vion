import { createServer } from "http";
import next from "next";
import { registerSocketServer } from "./socket";

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

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Server bootstrap failed:", error);

  process.exit(1);
});
