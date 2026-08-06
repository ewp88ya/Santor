import {
  createDeviceController,
  listDeviceController,
  detailDeviceController,
  revokeDeviceController,
  regenerateDeviceController,
} from './device.controller.js';

import { authMiddleware } from '../../middleware/auth.middleware.js';

export default async function deviceRoutes(app: any) {
  app.post(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: any) => {
      return createDeviceController(request);
    },
  );

  app.get(
    '/:id',
    {
      preHandler: authMiddleware,
    },
    async (request: any) => {
      return detailDeviceController(request);
    },
  );

  app.get(
    '/vpn/:vpnAccessId',
    {
      preHandler: authMiddleware,
    },
    async (request: any) => {
      return listDeviceController(request);
    },
  );

  app.delete(
    '/:id',
    {
      preHandler: authMiddleware,
    },
    async (request: any) => {
      return revokeDeviceController(request);
    },
  );

  app.post(
    '/:id/regenerate',
    {
      preHandler: authMiddleware,
    },
    async (request: any) => {
      return regenerateDeviceController(request);
    },
  );
}
