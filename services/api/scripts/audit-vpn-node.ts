import { prisma } from '../src/config/database.js';

const nodes = await prisma.vPNNode.findMany({
  orderBy: {
    createdAt: 'asc',
  },
});

console.log(
  JSON.stringify(
    nodes.map((node) => ({
      id: node.id,
      name: node.name,
      hostname: node.hostname,
      port: node.port,
      protocol: node.protocol,
      active: node.active,
      hasPublicKey: Boolean(node.publicKey),
      publicKeyLength: node.publicKey?.length ?? 0,
      hasProvisioningUrl: Boolean(node.provisioningUrl),
      hasProvisioningKey: Boolean(node.provisioningKey),
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    })),
    null,
    2,
  ),
);

await prisma.$disconnect();
