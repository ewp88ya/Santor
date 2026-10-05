import { prisma } from '../../config/database.js';

const DEFAULT_PHASES = [
  [1, 'Project foundation / frontend QA', 'complete'],
  [2, 'Database & core API', 'complete'],
  [3, 'Authentication & authorization', 'complete'],
  [4, 'Product, subscription & license', 'foundation'],
  [5, 'VPN application layer & device management', 'complete'],
  [6, 'Dashboard', 'complete'],
  [7, 'VPN node management architecture', 'foundation'],
  [8, 'Payment platform', 'foundation'],
  [9, 'Payment webhook', 'foundation'],
  [10, 'Payment & entitlement lifecycle', 'complete'],
  [11, 'Integration / failure / race testing', 'complete'],
  [12, 'Local production-readiness gate', 'complete'],
  [13, 'LN-NeU ↔ Santor integration', 'complete'],
  [14, 'VPS / production infrastructure', 'partial'],
  [15, 'Production launch & live validation', 'pending'],
] as const;

async function ensureDefaults() {
  const count = await prisma.roadmapPhase.count();
  if (count > 0) return;
  await prisma.roadmapPhase.createMany({
    data: DEFAULT_PHASES.map(([phase, title, status]) => ({
      phase,
      title,
      status,
      sortOrder: phase,
      note: null,
    })),
  });
}

export async function listRoadmap() {
  await ensureDefaults();
  return prisma.roadmapPhase.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
}

export async function updateRoadmapPhase(id: string, input: unknown) {
  const value = input as Record<string, unknown>;
  const allowed = ['validation', 'complete', 'foundation', 'partial', 'pending'];
  const status =
    typeof value.status === 'string' && allowed.includes(value.status) ? value.status : undefined;
  const note = typeof value.note === 'string' ? value.note.trim() || null : undefined;
  if (!status && note === undefined) throw new Error('Invalid roadmap update');
  return prisma.roadmapPhase.update({
    where: { id },
    data: { ...(status ? { status } : {}), ...(note !== undefined ? { note } : {}) },
  });
}
