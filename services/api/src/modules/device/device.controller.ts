import type { FastifyRequest } from 'fastify';

import createError from 'http-errors';

import {
  addDevice,
  getDevice,
  getDevices,
  disableDevice,
  regenerateDeviceConfig,
} from './device.service.js';

function getUserId(request: FastifyRequest): string {
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
    vpnAccessId?: string;
    name?: string;
  };

  if (!body?.vpnAccessId) {
    throw createError(400, 'vpnAccessId is required');
  }

  if (!body?.name?.trim()) {
    throw createError(400, 'Device name is required');
  }

  return addDevice(userId, body.vpnAccessId, body.name.trim());
}

export async function listDeviceController(request: FastifyRequest) {
  const userId = getUserId(request);

  const params = request.params as {
    vpnAccessId?: string;
  };

  if (!params?.vpnAccessId) {
    throw createError(400, 'vpnAccessId is required');
  }

  return getDevices(userId, params.vpnAccessId);
}

export async function detailDeviceController(request: FastifyRequest) {
  const userId = getUserId(request);

  const params = request.params as {
    id?: string;
  };

  if (!params?.id) {
    throw createError(400, 'Device id is required');
  }

  return getDevice(userId, params.id);
}

export async function revokeDeviceController(request: FastifyRequest) {
  const userId = getUserId(request);

  const params = request.params as {
    id?: string;
  };

  if (!params?.id) {
    throw createError(400, 'Device id is required');
  }

  return disableDevice(userId, params.id);
}

export async function regenerateDeviceController(request: FastifyRequest) {
  const userId = getUserId(request);

  const params = request.params as {
    id?: string;
  };

  if (!params?.id) {
    throw createError(400, 'Device id is required');
  }

  return regenerateDeviceConfig(userId, params.id);
}
