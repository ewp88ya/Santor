import argon2 from 'argon2';

import { prisma } from '../../config/database.js';

import { findUserByEmail, createUser } from './auth.repository.js';

import { signToken } from './jwt.js';

import { generateLicense } from '../license/license.service.js';


export async function register(
  email: string,
  password: string,
  name?: string,
) {
  const existing = await findUserByEmail(email);

  if (existing) {
    throw new Error('Email already registered');
  }


  const hashedPassword = await argon2.hash(password);


  const user = await createUser({
    email,
    name,
    passwordHash: hashedPassword,
  });


  // Auto create GENERAL-FREE subscription
  const freeProduct = await prisma.product.findUnique({
    where: {
      code: 'GENERAL-FREE',
    },
  });


  if (!freeProduct) {
    throw new Error('Free product not found');
  }


  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      productId: freeProduct.id,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(
        Date.now() +
          freeProduct.durationDays *
            24 *
            60 *
            60 *
            1000,
      ),
    },
  });


  // Auto create License + VPN Access
  await generateLicense(subscription.id);


  return {
    id: user.id,

    email: user.email,

    token: signToken({
      id: user.id,

      email: user.email,
    }),
  };
}



export async function login(
  email: string,
  password: string,
) {
  const user = await findUserByEmail(email);


  if (!user) {
    throw new Error('Invalid credentials');
  }


  const valid = await argon2.verify(
    user.passwordHash,
    password,
  );


  if (!valid) {
    throw new Error('Invalid credentials');
  }


  return {
    id: user.id,

    email: user.email,

    token: signToken({
      id: user.id,

      email: user.email,
    }),
  };
}
