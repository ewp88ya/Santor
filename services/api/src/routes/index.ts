import type { FastifyInstance } from "fastify";

import v1Routes from "./v1/index.js";


export async function registerRoutes(
  app: FastifyInstance
) {
  await app.register(
    v1Routes,
    {
      prefix: "/api/v1",
    }
  );
}
