import createError from 'http-errors';

import {
  generateWireGuardPeer,
  getWireGuardConfig,
  regenerateWireGuardConfig,
} from './wireguard.service.js';

import { getDevice } from '../device/device.service.js';

function getUserId(request: any): string {
  const user = request.user as {
    id?: string;
  };

  if (!user?.id) {
    throw createError(401, 'Invalid user token');
  }

  return user.id;
}

export async function generateWireGuard(request: any) {
  const userId = getUserId(request);

  const body = request.body as {
    deviceId?: string;
  };

  if (!body?.deviceId) {
    throw createError(400, 'deviceId is required');
  }

  await getDevice(userId, body.deviceId);

  return generateWireGuardPeer(body.deviceId);
}

export async function regenerateWireGuard(request: any) {
  const userId = getUserId(request);

  const params = request.params as {
    deviceId: string;
  };

  if (!params?.deviceId) {
    throw createError(400, 'deviceId is required');
  }

  return regenerateWireGuardConfig(userId, params.deviceId);
}

export async function downloadWireGuardConfig(
  request: any,
  reply: any,
) {
  const userId = getUserId(request);

  const params = request.params as {
    deviceId: string;
  };

  if (!params?.deviceId) {
    throw createError(400, 'deviceId is required');
  }

  const config = await getWireGuardConfig(
    userId,
    params.deviceId,
  );

  reply.header(
    'Content-Disposition',
    'attachment; filename=wireguard.conf',
  );

  reply.type('text/plain');

  return config;
}
