import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { prisma } from '../config/database.js';

describe('REAL DATABASE — PostgreSQL Integration', () => {
  const runId = randomUUID();

  let databaseConnected = false;

  beforeAll(async () => {
    await prisma.$connect();

    await prisma.$queryRaw`SELECT 1`;

    databaseConnected = true;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('connects to the real PostgreSQL database', async () => {
    expect(databaseConnected).toBe(true);

    const result = await prisma.$queryRaw<
      Array<{
        current_database: string;
        current_user: string;
      }>
    >`
      SELECT current_database(), current_user
    `;

    expect(result).toHaveLength(1);
    expect(result[0].current_database).toBe('santor');
    expect(result[0].current_user).toBe('santor');
  });

  it('can execute a real transaction and roll it back', async () => {
    const result = await prisma.$transaction(async (tx) => {
      const transactionCheck = await tx.$queryRaw<Array<{ value: number }>>`SELECT 1 AS value`;

      expect(transactionCheck[0].value).toBe(1);

      return 'transaction-ok';
    });

    expect(result).toBe('transaction-ok');
  });

  it('can read the real Prisma schema through PostgreSQL', async () => {
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const tableNames = tables.map((table) => table.table_name);

    expect(tableNames.length).toBeGreaterThan(0);

    expect(tableNames).toContain('_prisma_migrations');

    console.log(`[REAL-DB] run=${runId} tables=${tableNames.length}`);
  });

  it('can inspect Prisma migration state from the real database', async () => {
    const migrations = await prisma.$queryRaw<
      Array<{
        migration_name: string;
        finished_at: Date | null;
      }>
    >`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      ORDER BY started_at
    `;

    expect(migrations.length).toBeGreaterThanOrEqual(18);

    for (const migration of migrations) {
      expect(migration.finished_at).not.toBeNull();
    }

    console.log(`[REAL-DB] applied migrations=${migrations.length}`);
  });
});
