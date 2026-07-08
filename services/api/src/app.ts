import Fastify from "fastify";
import cors from "@fastify/cors";

import prismaPlugin from "./plugins/prisma.js";
import { registerRoutes } from "./routes/index.js";


export async function createApp() {
  const app = Fastify({
    logger: true,
  });


  await app.register(cors);

  await app.register(prismaPlugin);

  await registerRoutes(app);


  return app;
}
