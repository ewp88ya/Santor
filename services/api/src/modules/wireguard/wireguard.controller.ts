import createError from 'http-errors';

import {
  generateWireGuardPeer,
  getWireGuardConfig,
  regenerateWireGuardConfig,
} from './wireguard.service.js';

export async function generateWireGuard(request: any) {
  const { deviceId } = request.body;

  return generateWireGuardPeer(deviceId);
}

export async function regenerateWireGuard(request: any) {
  const user = request.user as {
    id?: string;
  };

  if (!user?.id) {
    throw createError(401, 'Invalid user token');
  }

  const { deviceId } = request.params;

  return regenerateWireGuardConfig(user.id, deviceId);
}

export async function downloadWireGuardConfig(request: any, reply: any) {
  const user = request.user as {
    id?: string;
  };

  if (!user?.id) {
    throw createError(401, 'Invalid user token');
  }

  const { deviceId } = request.params;

  const config = await getWireGuardConfig(user.id, deviceId);

  reply.header('Content-Disposition', 'attachment; filename=wireguard.conf');

  reply.type('text/plain');

  return config;
}
