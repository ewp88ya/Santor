import { randomUUID } from 'node:crypto';

export function generateWireGuardConfig() {
  const privateKey = randomUUID().replaceAll('-', '');

  const publicKey = randomUUID().replaceAll('-', '');

  const config = `
[Interface]
PrivateKey = ${privateKey}
Address = 10.0.0.2/32
DNS = 1.1.1.1

[Peer]
PublicKey = ${publicKey}
Endpoint = node-1.santor.app:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
`;

  return {
    privateKey,
    publicKey,
    config,
  };
}
