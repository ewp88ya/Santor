import type { FastifyInstance } from 'fastify';

import { loginController, registerController } from './auth.controller.js';
import { loginBodySchema, registerBodySchema } from './auth.schema.js';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/register', { schema: registerBodySchema }, registerController);

  app.post('/login', { schema: loginBodySchema }, loginController);
}
