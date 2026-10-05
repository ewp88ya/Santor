import type { FastifyInstance } from 'fastify';

import { getSiteConfig } from './site.service.js';

export default async function siteRoutes(app: FastifyInstance) {
  app.get('/config', async () => getSiteConfig(app));
}
