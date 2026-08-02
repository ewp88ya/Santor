import type { FastifyInstance } from 'fastify';

import { loginController, registerController } from './auth.controller.js';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/register', registerController);

  app.post('/login', loginController);
}
