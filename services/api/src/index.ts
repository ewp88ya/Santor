import "dotenv/config";
import { createApp } from "./app.js";
import { env } from "./config/env.js";


const start = async () => {
  const app = await createApp();

  try {
    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });

    console.log(
      `Santor API running on port ${env.PORT}`
    );

  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};


start();
