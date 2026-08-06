import type { FastifyRequest } from 'fastify';

import createError from 'http-errors';

import {
  addDevice,
  getDevice,
  getDevices,
  disableDevice,
  regenerateDeviceConfig,
} from './device.service.js';

function getUserId(request: FastifyRequest) {
  const user = request.user as {
    id?: string;
  };

  if (!user?.id) {
    throw createError(401, 'Invalid user token');
  }

  return user.id;
}

export async function createDeviceController(request: FastifyRequest) {
  const userId = getUserId(request);

  const body = request.body as {
    vpnAccessId: string;
    name: string;
  };

  return addDevice(userId, body.vpnAccessId, body.name);
}

export async function listDeviceController(request: FastifyRequest) {
  const userId = getUserId(request);

  const params = request.params as {
    vpnAccessId: string;
  };

  return getDevices(userId, params.vpnAccessId);
}

export async function detailDeviceController(request: FastifyRequest) {
  const userId = getUserId(request);

  const params = request.params as {
    id: string;
  };

  return getDevice(userId, params.id);
}

export async function revokeDeviceController(request: FastifyRequest) {
  const userId = getUserId(request);

  const params = request.params as {
    id: string;
  };

  return disableDevice(userId, params.id);
}

export async function regenerateDeviceController(request: FastifyRequest) {
  const userId = getUserId(request);

  const params = request.params as {
    id: string;
  };

  return regenerateDeviceConfig(userId, params.id);
}
