import { describe, expect, it } from 'vitest';

import { prisma } from '../../../config/database.js';

const EXPECTED_CATALOG = [
  ['GENERAL-FREE', 0, 'USD', 3, 1],
  ['GENERAL-PRO-1M', 199, 'USD', 30, 3],
  ['GENERAL-PRO-6M', 999, 'USD', 180, 3],
  ['GENERAL-PRO-12M', 1499, 'USD', 365, 3],
  ['WG-1M', 499, 'USD', 30, 5],
  ['WG-3M', 1299, 'USD', 90, 5],
  ['WG-6M', 2299, 'USD', 180, 5],
  ['WG-12M', 3999, 'USD', 365, 5],
] as const;

describe('final production catalog seed', () => {
  it('contains exactly the approved active catalog', async () => {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        code: true,
        price: true,
        currency: true,
        durationDays: true,
        deviceLimit: true,
      },
      orderBy: { code: 'asc' },
    });

    expect(products).toHaveLength(EXPECTED_CATALOG.length);

    for (const [code, price, currency, durationDays, deviceLimit] of EXPECTED_CATALOG) {
      const product = products.find((item) => item.code === code);

      expect(product, `missing active product ${code}`).toBeDefined();
      expect(product).toMatchObject({ code, price, currency, durationDays, deviceLimit });
    }

    expect(products.map((product) => product.code).sort()).toEqual(
      [...EXPECTED_CATALOG.map(([code]) => code)].sort(),
    );
  });

  it('has one active US ProductPrice per approved product and no active legacy product price', async () => {
    const prices = await prisma.productPrice.findMany({
      where: {
        active: true,
        country: 'US',
        currency: 'USD',
      },
      include: {
        product: {
          select: { code: true, active: true },
        },
      },
      orderBy: { product: { code: 'asc' } },
    });

    expect(prices).toHaveLength(EXPECTED_CATALOG.length);

    for (const price of prices) {
      expect(price.product.active).toBe(true);
    }

    const codes = prices.map((price) => price.product.code).sort();
    expect(codes).toEqual([...EXPECTED_CATALOG.map(([code]) => code)].sort());
  });

  it('does not keep the legacy GENERAL-PRO product active', async () => {
    const legacy = await prisma.product.findUnique({
      where: { code: 'GENERAL-PRO' },
      select: { active: true },
    });

    if (legacy) {
      expect(legacy.active).toBe(false);
    }
  });
});
