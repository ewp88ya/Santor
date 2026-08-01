import { randomUUID } from 'node:crypto';

import {
  createDevice,
  findDeviceById,
  listDevices,
  countActiveDevices,
} from './device.repository.js';

import { prisma } from '../../config/database.js';

import createError from 'http-errors';


function generateClientKey() {
  return randomUUID().replaceAll('-', '');
}


export async function addDevice(
  vpnAccessId: string,
  name: string,
) {
  const vpnAccess = await prisma.vPNAccess.findUnique({
    where: {
      id: vpnAccessId,
    },
    include: {
      license: {
        include: {
          subscription: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });


  if (!vpnAccess) {
    throw createError(
      404,
      'VPN Access not found',
    );
  }


  const limit =
    vpnAccess
      .license
      .subscription
      .product
      .deviceLimit;


  const activeDevices =
    await countActiveDevices(vpnAccessId);


  if (activeDevices >= limit) {
    throw createError(
      403,
      `Device limit reached (${limit})`,
    );
  }


  const publicKey = generateClientKey();


  return createDevice({
    vpnAccessId,
    name,
    publicKey,
  });
}


export async function getDevice(id: string) {
  return findDeviceById(id);
}


export async function getDevices(vpnAccessId: string) {
  return listDevices(vpnAccessId);
}
