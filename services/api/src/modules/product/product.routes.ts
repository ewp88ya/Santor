import type { FastifyInstance } from "fastify";

import {
  listProducts,
  detailProduct,
} from "./product.controller.js";


export default async function productRoutes(
  app: FastifyInstance,
) {

  app.get(
    "/products",
    async () => {
      return listProducts();
    },
  );


  app.get(
    "/products/:id",
    async (request) => {

      const {
        id,
      } = request.params as {
        id: string;
      };


      return detailProduct(id);
    },
  );

}
