import { prisma } from '../../config/database.js';

export async function updateVPNAccessConfig(id: string, configUrl: string) {
  return prisma.vPNAccess.update({
    where: {
      id,
    },
    data: {
      configUrl,
    },
  });
}
