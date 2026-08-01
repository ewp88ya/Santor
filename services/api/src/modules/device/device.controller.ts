import { addDevice, getDevice, getDevices } from './device.service.js';

export async function createDeviceController(body: { vpnAccessId: string; name: string }) {
  return addDevice(body.vpnAccessId, body.name);
}

export async function listDeviceController(vpnAccessId: string) {
  return getDevices(vpnAccessId);
}

export async function detailDeviceController(id: string) {
  return getDevice(id);
}
