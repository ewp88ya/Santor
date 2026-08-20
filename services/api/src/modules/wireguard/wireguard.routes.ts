import {
  generateWireGuard,
  downloadWireGuardConfig,
  regenerateWireGuard,
} from './wireguard.controller.js';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { deviceRateLimit } from '../../middleware/rate-limit.middleware.js';

export default async function wireguardRoutes(app: any) {
  app.post(
    '/generate',
    {
      preHandler: [authMiddleware, requirePermission('device:regenerate'), deviceRateLimit],
    },
    async (request: any) => {
      return generateWireGuard(request);
    },
  );

  app.post(
    '/regenerate/:deviceId',
    {
      preHandler: [authMiddleware, requirePermission('device:regenerate'), deviceRateLimit],
    },
    async (request: any) => {
      return regenerateWireGuard(request);
    },
  );

  app.get(
    '/config/:deviceId',
    {
      preHandler: [authMiddleware, requirePermission('device:read'), deviceRateLimit],
    },
    async (request: any, reply: any) => {
      return downloadWireGuardConfig(request, reply);
    },
  );
}
