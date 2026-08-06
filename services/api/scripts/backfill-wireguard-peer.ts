import { prisma } from '../src/config/database.js';
import { randomBytes } from 'node:crypto';

function generateKey() {
  return randomBytes(16).toString('hex');
}

async function main() {
  const devices = await prisma.device.findMany({
    where: {
      wireguardPeer: null,
    },
  });

  console.log(`Found ${devices.length} devices without WireGuardPeer`);

  for (const device of devices) {
    await prisma.wireGuardPeer.create({
      data: {
        deviceId: device.id,
        privateKey: generateKey(),
        publicKey: generateKey(),
        address: `10.0.0.${Math.floor(Math.random() * 200) + 2}/32`,
        endpoint: 'node-1.santor.app:51820',
      },
    });

    console.log(`Created peer for ${device.id}`);
  }

  console.log('Backfill complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
