import { randomUUID } from 'node:crypto';

import { createDevice, findDeviceById, listDevices } from './device.repository.js';

function generateClientKey() {
  return randomUUID().replaceAll('-', '');
}

export async function addDevice(vpnAccessId: string, name: string) {
  const publicKey = generateClientKey();

  return createDevice({
    vpnAccessId,
    name,
    publicKey,
  });
}

export async function getDevice(id: string) {
  return findDeviceById(id);
}

export async function getDevices(vpnAccessId: string) {
  return listDevices(vpnAccessId);
}
