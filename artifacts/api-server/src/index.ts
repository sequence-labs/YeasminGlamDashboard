import app from "./app";
import { logger } from "./lib/logger";
import { ensureDefaultServiceItems } from "./routes/services";

const rawPort = process.env["PORT"] ?? "8787";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  await ensureDefaultServiceItems();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

void start().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
