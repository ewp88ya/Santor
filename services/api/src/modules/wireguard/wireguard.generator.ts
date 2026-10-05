import { generateWireGuardKeyPair } from './wireguard.crypto.js';

export function generateWireGuardConfig(
  address = '10.66.0.2/32',
  endpoint = '187.126.113.168:51820',
  serverPublicKey = '',
) {
  const { privateKey, publicKey } = generateWireGuardKeyPair();
  const config = `[Interface]\nPrivateKey = ${privateKey}\nAddress = ${address}\nDNS = 1.1.1.1\n\n[Peer]\nPublicKey = ${serverPublicKey}\nEndpoint = ${endpoint}\nAllowedIPs = 0.0.0.0/0\nPersistentKeepalive = 25`;
  return { privateKey, publicKey, config };
}
