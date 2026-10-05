import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { deviceRateLimit } from '../../middleware/rate-limit.middleware.js';
import { proxyProfileController, revokeProxyController } from './proxy.controller.js';

export default async function proxyRoutes(app: any) {
  app.get(
    '/profile/:id',
    {
      preHandler: [authMiddleware, requirePermission('device:read'), deviceRateLimit],
    },
    proxyProfileController,
  );

  app.delete(
    '/profile/:id',
    {
      preHandler: [authMiddleware, requirePermission('device:revoke'), deviceRateLimit],
    },
    revokeProxyController,
  );
}
