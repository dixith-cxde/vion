import { createServer } from "http";
import next from "next";
import { registerSocketServer } from "./socket";
const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

async function bootstrap() {
  const app = next({ dev, hostname, port });
  const nextHandler = app.getRequestHandler();

  await app.prepare();

  const httpserver = createServer((req, res) => {
    nextHandler(req, res);
  });
  registerSocketServer(httpserver);

  httpserver.listen(port, () => {
    console.log(`>> Server ready on http://${hostname}:${port}`);
  });
}
bootstrap().catch((error) => {
  console.error("ERROR: Failed to bootstrap server: ", error);
  process.exit(1);
});
