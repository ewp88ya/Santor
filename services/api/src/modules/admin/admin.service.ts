import createError from 'http-errors';
import os from 'node:os';
import net from 'node:net';
import fs from 'node:fs/promises';
import { prisma } from '../../config/database.js';
import { DEFAULT_SITE_CONFIG, SITE_CONFIG_ID, type SiteConfigPayload } from './admin.constants.js';

function validatePayload(input: unknown): SiteConfigPayload {
  if (!input || typeof input !== 'object') throw createError(400, 'Invalid site config');
  const value = input as Record<string, unknown>;
  const fields = [
    'brand',
    'heroTitle',
    'heroSubtitle',
    'primaryCta',
    'secondaryCta',
    'trustLine',
    'primaryColor',
  ];
  for (const field of fields) {
    if (typeof value[field] !== 'string' || !(value[field] as string).trim())
      throw createError(400, 'Invalid ' + field);
  }
  if (!Array.isArray(value.services)) throw createError(400, 'Invalid services');
  const services = value.services.map((item) => {
    if (!item || typeof item !== 'object') throw createError(400, 'Invalid service');
    const service = item as Record<string, unknown>;
    if (['label', 'title', 'description'].some((k) => typeof service[k] !== 'string'))
      throw createError(400, 'Invalid service');
    return {
      label: String(service.label).trim(),
      title: String(service.title).trim(),
      description: String(service.description).trim(),
    };
  });
  return {
    brand: String(value.brand).trim(),
    heroTitle: String(value.heroTitle).trim(),
    heroSubtitle: String(value.heroSubtitle).trim(),
    primaryCta: String(value.primaryCta).trim(),
    secondaryCta: String(value.secondaryCta).trim(),
    trustLine: String(value.trustLine).trim(),
    primaryColor: String(value.primaryColor).trim(),
    services,
  };
}

function output(config: any) {
  return {
    brand: config.brand,
    heroTitle: config.heroTitle,
    heroSubtitle: config.heroSubtitle,
    primaryCta: config.primaryCta,
    secondaryCta: config.secondaryCta,
    trustLine: config.trustLine,
    primaryColor: config.primaryColor,
    services: config.services,
  };
}

export async function getAdminOverview() {
  const [users, subscriptions, activeProducts] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count(),
    prisma.product.count({ where: { active: true } }),
  ]);
  return { stats: { users, subscriptions, activeProducts } };
}

async function timedFetch(url: string, timeoutMs = 5000) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    return { ok: response.ok, status: response.status, latencyMs: Date.now() - started };
  } catch {
    return { ok: false, status: null, latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

async function measureDownloadMbps() {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('https://speed.cloudflare.com/__down?bytes=1000000', {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok || !response.body) return null;
    let bytes = 0;
    for await (const chunk of response.body as any) bytes += Buffer.byteLength(chunk);
    const seconds = Math.max((Date.now() - started) / 1000, 0.001);
    return Number(((bytes * 8) / seconds / 1_000_000).toFixed(2));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function diskStats() {
  try {
    const statfs = await fs.statfs('/');
    const total = Number(statfs.blocks) * Number(statfs.bsize);
    const free = Number(statfs.bavail) * Number(statfs.bsize);
    return {
      totalBytes: total,
      freeBytes: free,
      usedPercent: total ? Math.round(((total - free) / total) * 100) : null,
    };
  } catch {
    return { totalBytes: null, freeBytes: null, usedPercent: null };
  }
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

async function tcpProbe(host: string, port: number, timeoutMs = 3000) {
  const started = Date.now();
  return await new Promise<{ ok: boolean; latencyMs: number }>((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (ok: boolean) => {
      socket.destroy();
      resolve({ ok, latencyMs: Date.now() - started });
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

async function syncInfrastructureEvents(monitoring: {
  node: { id: string; status: string; stabilityIndex: number };
  internet: { status: string; latencyMs: number };
  domains: Array<{ url: string; ok: boolean; httpStatus: number | null; latencyMs: number }>;
  regions: Array<{ nodeId: string; city: string; country: string; status: string }>;
}) {
  const detected: Array<{
    severity: string;
    source: string;
    category: string;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
  }> = [];
  if (monitoring.node.status !== 'online')
    detected.push({
      severity: 'critical',
      source: 'vps',
      category: 'alarms',
      title: 'VPS offline',
      message: monitoring.node.id,
      metadata: { nodeId: monitoring.node.id },
    });
  if (monitoring.node.stabilityIndex < 70)
    detected.push({
      severity: 'warning',
      source: 'vps',
      category: 'problems',
      title: 'VPS stability degraded',
      message: `Stability index ${monitoring.node.stabilityIndex}/100`,
      metadata: { nodeId: monitoring.node.id },
    });
  if (monitoring.internet.status !== 'online')
    detected.push({
      severity: 'critical',
      source: 'internet',
      category: 'alarms',
      title: 'Internet connectivity degraded',
      message: `Latency ${monitoring.internet.latencyMs} ms`,
      metadata: {},
    });
  for (const domain of monitoring.domains) {
    if (!domain.ok)
      detected.push({
        severity: 'critical',
        source: 'domain',
        category: 'problems',
        title: 'Domain/website problem',
        message: `${domain.url} returned ${domain.httpStatus ?? 'no response'}`,
        metadata: { url: domain.url },
      });
    else if (domain.latencyMs > 1500)
      detected.push({
        severity: 'warning',
        source: 'domain',
        category: 'problems',
        title: 'Domain latency high',
        message: `${domain.url} — ${domain.latencyMs} ms`,
        metadata: { url: domain.url, latencyMs: domain.latencyMs },
      });
  }
  for (const region of monitoring.regions) {
    if (region.status !== 'online')
      detected.push({
        severity: 'critical',
        source: 'regional-vps',
        category: 'problems',
        title: 'Regional VPS problem',
        message: `${region.nodeId} — ${region.city}, ${region.country}`,
        metadata: { nodeId: region.nodeId },
      });
  }
  for (const item of detected) {
    const existing = await prisma.adminOperationalEvent.findFirst({
      where: { status: { in: ['open', 'acknowledged'] }, source: item.source, title: item.title },
    });
    if (!existing)
      await prisma.adminOperationalEvent.create({
        data: { ...item, metadata: item.metadata as any },
      });
  }
}

export async function getInfrastructureMonitoring() {
  const memoryTotal = os.totalmem();
  const memoryFree = os.freemem();
  const memoryUsedPercent = memoryTotal
    ? Math.round(((memoryTotal - memoryFree) / memoryTotal) * 100)
    : 0;
  const cpuCount = os.cpus().length || 1;
  const load = os.loadavg();
  const loadPercent = clamp((load[0] / cpuCount) * 100);
  const disk = await diskStats();

  const [internet, speedMbps, domains, tunnels] = await Promise.all([
    timedFetch('https://www.cloudflare.com/cdn-cgi/trace', 6000),
    measureDownloadMbps(),
    Promise.all(
      ['https://santor.app/', 'https://admin.santor.app/', 'https://mcp.santor.app/health'].map(
        async (url) => ({
          url,
          ...(await timedFetch(url, 6000)),
        }),
      ),
    ),
    prisma.tunnelProfile.findMany({ where: { enabled: true }, orderBy: { updatedAt: 'desc' } }),
  ]);

  const resourceScore =
    100 -
    Math.round(loadPercent * 0.35) -
    Math.round(memoryUsedPercent * 0.35) -
    Math.round((disk.usedPercent ?? 0) * 0.2) -
    (internet.ok ? 0 : 15);
  const stabilityIndex = clamp(resourceScore);

  const result = {
    generatedAt: new Date().toISOString(),
    node: {
      id: 'asia-vpn-01',
      country: 'India',
      city: 'Mumbai',
      role: 'Asia VPN',
      status: 'online',
      source: 'local-host',
      stabilityIndex,
      uptimeSeconds: Math.round(os.uptime()),
      load: load.map((value) => Number(value.toFixed(2))),
      cpuCount,
      memory: { totalBytes: memoryTotal, freeBytes: memoryFree, usedPercent: memoryUsedPercent },
      disk,
    },
    internet: {
      status: internet.ok ? 'online' : 'degraded',
      latencyMs: internet.latencyMs,
      speedMbps,
      note: 'Latency and throughput are measured from the monitored VPS. Regional probes can be added as additional nodes without changing the dashboard model.',
    },
    domains: domains.map((item) => ({
      ...item,
      httpStatus: item.status,
      status: item.ok ? 'online' : 'degraded',
    })),
    regions: [
      {
        country: 'India',
        city: 'Mumbai',
        nodeId: 'asia-vpn-01',
        status: 'online',
        stabilityIndex,
        latencyMs: internet.latencyMs,
      },
      ...(await Promise.all(
        tunnels.map(async (tunnel) => {
          const endpoint = typeof tunnel.endpoint === 'string' ? tunnel.endpoint.trim() : '';
          const port = tunnel.port ? Number(tunnel.port) : 0;
          const probe =
            endpoint && port ? await tcpProbe(endpoint, port) : { ok: false, latencyMs: 0 };
          const stability = probe.ok ? 100 : 35;
          return {
            country: 'Configured',
            city: tunnel.name,
            nodeId: tunnel.nodeId || tunnel.id,
            status: probe.ok ? 'online' : 'degraded',
            stabilityIndex: stability,
            latencyMs: probe.latencyMs,
          };
        }),
      )),
    ],
  };
  await syncInfrastructureEvents(result);
  return result;
}

export async function getSiteConfig() {
  const existing = await prisma.siteConfig.findUnique({ where: { id: SITE_CONFIG_ID } });
  if (existing) return output(existing);
  const created = await prisma.siteConfig.create({
    data: { id: SITE_CONFIG_ID, ...DEFAULT_SITE_CONFIG },
  });
  return output(created);
}

export async function updateSiteConfig(input: unknown) {
  const data = validatePayload(input);
  const saved = await prisma.siteConfig.upsert({
    where: { id: SITE_CONFIG_ID },
    create: { id: SITE_CONFIG_ID, ...data },
    update: data,
  });
  return output(saved);
}

export async function getOperationalEvents(query: { status?: string; category?: string } = {}) {
  return prisma.adminOperationalEvent.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function updateOperationalEvent(id: string, input: any) {
  const data: Record<string, unknown> = {};
  if (typeof input?.status === 'string') {
    data.status = input.status;
    if (input.status === 'resolved') data.resolvedAt = new Date();
  }
  if (typeof input?.acknowledgedBy === 'string') {
    data.acknowledgedBy = input.acknowledgedBy;
    data.acknowledgedAt = new Date();
  }
  if (typeof input?.assignedTo === 'string') data.assignedTo = input.assignedTo;
  return prisma.adminOperationalEvent.update({ where: { id }, data });
}
