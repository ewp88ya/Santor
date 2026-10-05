import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/permission.middleware.js';
import {
  adminControlPlane,
  updateAdminControlPlaneController,
} from './control-plane.controller.js';

export default async function controlPlaneRoutes(app: FastifyInstance) {
  const guard = [authMiddleware, requireRole('ADMIN')];
  app.get('/control-plane', { preHandler: guard }, adminControlPlane);
  app.put('/control-plane', { preHandler: guard }, updateAdminControlPlaneController);
}
