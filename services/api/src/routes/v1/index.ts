import type { FastifyInstance } from "fastify";

import healthRoute from "./health.js";


export default async function v1Routes(
  app: FastifyInstance
) {
  await app.register(healthRoute);
}
