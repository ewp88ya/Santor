import { describe, expect, it } from 'vitest';

import { x25519 } from '@noble/curves/ed25519.js';

import { generateWireGuardKeyPair } from '../wireguard.crypto.js';

describe('wireguard.crypto', () => {
  it('generates a WireGuard-compatible keypair', () => {
    const keyPair = generateWireGuardKeyPair();

    expect(keyPair.privateKey).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(keyPair.publicKey).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);

    expect(Buffer.from(keyPair.privateKey, 'base64')).toHaveLength(32);
    expect(Buffer.from(keyPair.publicKey, 'base64')).toHaveLength(32);
  });

  it('derives the public key from the private key', () => {
    const keyPair = generateWireGuardKeyPair();

    const privateKey = Buffer.from(keyPair.privateKey, 'base64');
    const expectedPublicKey = x25519.getPublicKey(privateKey);

    expect(Buffer.from(keyPair.publicKey, 'base64')).toEqual(Buffer.from(expectedPublicKey));
  });

  it('generates unique keypairs', () => {
    const first = generateWireGuardKeyPair();
    const second = generateWireGuardKeyPair();

    expect(first.privateKey).not.toBe(second.privateKey);
    expect(first.publicKey).not.toBe(second.publicKey);
  });
});
