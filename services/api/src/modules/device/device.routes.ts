import {
  createDeviceController,
  listDeviceController,
  detailDeviceController,
  revokeDeviceController,
  regenerateDeviceController,
} from './device.controller.js';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';

export default async function deviceRoutes(app: any) {
  app.post(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('device:create')],
    },
    async (request: any) => {
      return createDeviceController(request);
    },
  );

  app.get(
    '/:id',
    {
      preHandler: [authMiddleware, requirePermission('device:read')],
    },
    async (request: any) => {
      return detailDeviceController(request);
    },
  );

  app.get(
    '/vpn/:vpnAccessId',
    {
      preHandler: [authMiddleware, requirePermission('device:read')],
    },
    async (request: any) => {
      return listDeviceController(request);
    },
  );

  app.delete(
    '/:id',
    {
      preHandler: [authMiddleware, requirePermission('device:revoke')],
    },
    async (request: any) => {
      return revokeDeviceController(request);
    },
  );

  app.post(
    '/:id/regenerate',
    {
      preHandler: [authMiddleware, requirePermission('device:regenerate')],
    },
    async (request: any) => {
      return regenerateDeviceController(request);
    },
  );
}
