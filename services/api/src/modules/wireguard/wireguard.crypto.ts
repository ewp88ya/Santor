import { x25519 } from '@noble/curves/ed25519.js';

export type WireGuardKeyPair = {
  privateKey: string;
  publicKey: string;
};

export function generateWireGuardKeyPair(): WireGuardKeyPair {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);

  return {
    privateKey: Buffer.from(privateKey).toString('base64'),
    publicKey: Buffer.from(publicKey).toString('base64'),
  };
}
