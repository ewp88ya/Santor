import type { FastifyInstance } from "fastify";

import {
  createLicenseController,
  detailLicenseController,
  listLicenseController,
  subscriptionLicenseController,
} from "./license.controller.js";

export async function licenseRoutes(
  app: FastifyInstance,
) {
  app.post(
    "/licenses",
    async (request) => {
      return createLicenseController(
        request.body as {
          subscriptionId: string;
        },
      );
    },
  );

  app.get(
    "/licenses",
    async () => {
      return listLicenseController();
    },
  );

  app.get(
    "/licenses/:id",
    async (request) => {
      const { id } = request.params as {
        id: string;
      };

      return detailLicenseController(id);
    },
  );

  app.get(
    "/subscriptions/:id/license",
    async (request) => {
      const { id } = request.params as {
        id: string;
      };

      return subscriptionLicenseController(id);
    },
  );
}
