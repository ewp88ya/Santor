import type { FastifyInstance } from "fastify";

import healthRoute from "./health.js";
import productRoutes from "../../modules/product/product.routes.js";

export default async function v1Routes(
  app: FastifyInstance,
) {
  await app.register(healthRoute);
  await app.register(productRoutes);
}
