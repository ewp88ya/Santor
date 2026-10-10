import { createHash } from 'node:crypto';
import createError from 'http-errors';

import { findDeviceById } from '../device/device.repository.js';
import { provisionProxyUser, revokeProxyUser } from './proxy.client.js';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const PROXY_HOST = 'api.santor.app';
const PROXY_PATH = '/xray';

function uuidV5(name: string) {
  const namespace = Buffer.from(UUID_NAMESPACE.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(namespace).update(Buffer.from(name)).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function encode(value: string) {
  return encodeURIComponent(value);
}

export async function provisionProxyDevice(deviceId: string, deviceName: string) {
  const uuid = uuidV5(deviceId);
  const email = `santor-${deviceId}@proxy`;
  await provisionProxyUser(uuid, email);
}

export async function getProxyProfile(userId: string, deviceId: string) {
  const device = await findDeviceById(deviceId);
  if (!device || !device.active) {
    throw createError(404, 'Active device not found');
  }

  const access = device.vpnAccess;
  const subscription = access?.license?.subscription;
  if (!subscription || subscription.userId !== userId) {
    throw createError(404, 'Device not found');
  }
  if (subscription.status !== 'active' || (subscription.endDate && subscription.endDate.getTime() <= Date.now())) {
    throw createError(403, 'Active subscription required');
  }
  if (!access?.active || access.protocol !== 'vless') {
    throw createError(409, 'Active VLESS access required');
  }

  // Only return a profile after the remote provisioner confirms this user exists.
  await provisionProxyDevice(device.id, device.name);
  const uuid = uuidV5(device.id);
  const name = `Santor Proxy - ${device.name}`;
  const query = new URLSearchParams({
    encryption: 'none',
    type: 'ws',
    path: PROXY_PATH,
    host: PROXY_HOST,
    sni: PROXY_HOST,
  });
  const vless = `vless://${uuid}@${PROXY_HOST}:443?${query.toString()}#${encode(name)}`;

  return {
    success: true,
    deviceId: device.id,
    protocol: 'vless',
    transport: 'websocket',
    tls: true,
    host: PROXY_HOST,
    port: 443,
    path: PROXY_PATH,
    profile: vless,
    routing: {
      default: 'proxy',
      direct: ['private', 'local'],
      note: 'Use client-side per-app or domain bypass for traffic that should not use the proxy.',
    },
  };
}

export async function revokeProxyProfile(userId: string, deviceId: string) {
  const device = await findDeviceById(deviceId);
  if (!device) {
    throw createError(404, 'Device not found');
  }
  const subscription = device.vpnAccess?.license?.subscription;
  if (!subscription || subscription.userId !== userId) {
    throw createError(403, 'Device does not belong to current user');
  }
  await revokeProxyUser(uuidV5(device.id));
  return { success: true, deviceId };
}
