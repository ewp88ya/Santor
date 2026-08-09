import { prisma } from '../src/config/database.js';

const deviceId = '8e55020b-395c-440f-9726-3e7655482ac3';

const peer = await prisma.wireGuardPeer.findUnique({
  where: {
    deviceId,
  },
});

console.log(peer);

process.exit();
