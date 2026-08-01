import {
  generateWireGuardPeer,
  getWireGuardConfig,
} from './wireguard.service.js';


export async function generateWireGuard(
  request: any,
) {
  const { deviceId } = request.body;

  return generateWireGuardPeer(deviceId);
}


export async function downloadWireGuardConfig(
  request: any,
  reply: any,
) {
  const { deviceId } = request.params;

  const config = await getWireGuardConfig(deviceId);

  reply.header(
    'Content-Disposition',
    'attachment; filename=wireguard.conf',
  );

  reply.type('text/plain');

  return config;
}
