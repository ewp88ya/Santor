import "dotenv/config";

import { env } from "./config/env.js";
import { createApp } from "./server.js";

async function start() {
  const app = await createApp();

  try {
    await app.listen({
      host: "0.0.0.0",
      port: env.PORT,
    });

    app.log.info(`Santor API running on port ${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
