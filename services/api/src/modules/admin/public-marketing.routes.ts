import type { FastifyInstance } from 'fastify';
import { publicAds, publicSiteConfig } from './public-marketing.controller.js';

export default async function publicMarketingRoutes(app: FastifyInstance) {
  app.get('/site-config', publicSiteConfig);
  app.get('/ads', publicAds);
}
