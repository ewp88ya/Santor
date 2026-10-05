import { prisma } from '../../config/database.js';

const clients = ['WireGuard','Hiddify','v2RayTun','Happ','Proxy Gateway'];

export const productionTopology = {
  generalFree: { servers: 'Free Server', capacity: '100 users / 1h', policy: 'active usage/device check → continue active users; inactive → automatic disconnect → capacity released → reconnect subject to capacity + queue' },
  generalPro: { servers: 'Smart VPN / Smart VProxy', tier: 'Production General Nodes', controls: ['health', 'load', 'capacity', 'queue'] },
  wireguard: { servers: 'WireGuard', tier: 'Production WG Nodes', controls: ['health', 'load', 'capacity', 'queue'] },
};

export async function networkOverview() {
  const [tunnels, profiles, bypass] = await Promise.all([
    prisma.tunnelProfile.findMany({ orderBy: { updatedAt: 'desc' } }),
    prisma.clientProfile.findMany({ orderBy: { updatedAt: 'desc' } }),
    prisma.bypassRule.findMany({ orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }] }),
  ]);
  return { supportedClients: clients, tunnels, profiles, bypass };
}

export async function createTunnel(input: any) {
  if (!input?.name || !input?.protocol) throw new Error('name and protocol are required');
  return prisma.tunnelProfile.create({ data: {
    name: String(input.name).trim(),
    protocol: String(input.protocol).trim(),
    nodeId: input.nodeId || null,
    endpoint: input.endpoint || null,
    port: input.port ? Number(input.port) : null,
    enabled: input.enabled !== false,
    config: input.config && typeof input.config === 'object' ? input.config : {},
  }});
}

export async function updateTunnel(id: string, input: any) {
  return prisma.tunnelProfile.update({ where: { id }, data: {
    name: input.name,
    protocol: input.protocol,
    nodeId: input.nodeId || null,
    endpoint: input.endpoint || null,
    port: input.port ? Number(input.port) : null,
    enabled: input.enabled !== false,
    config: input.config && typeof input.config === 'object' ? input.config : {},
  }});
}

export async function createClientProfile(input: any) {
  if (!input?.name || !input?.client) throw new Error('name and client are required');
  return prisma.clientProfile.create({ data: {
    name: String(input.name).trim(),
    client: String(input.client).trim(),
    tunnelId: input.tunnelId || null,
    enabled: input.enabled !== false,
    config: input.config && typeof input.config === 'object' ? input.config : {},
  }});
}

export async function updateClientProfile(id: string, input: any) {
  return prisma.clientProfile.update({ where: { id }, data: {
    name: input.name,
    client: input.client,
    tunnelId: input.tunnelId || null,
    enabled: input.enabled !== false,
    config: input.config && typeof input.config === 'object' ? input.config : {},
  }});
}

export async function createBypassRule(input: any) {
  if (!input?.name || !input?.matchType || !input?.pattern) throw new Error('name, matchType and pattern are required');
  return prisma.bypassRule.create({ data: {
    name: String(input.name).trim(),
    matchType: String(input.matchType).trim(),
    pattern: String(input.pattern).trim(),
    action: input.action || 'direct',
    enabled: input.enabled !== false,
    priority: Number(input.priority ?? 100),
    notes: input.notes || null,
  }});
}

export async function updateBypassRule(id: string, input: any) {
  return prisma.bypassRule.update({ where: { id }, data: {
    name: input.name,
    matchType: input.matchType,
    pattern: input.pattern,
    action: input.action || 'direct',
    enabled: input.enabled !== false,
    priority: Number(input.priority ?? 100),
    notes: input.notes || null,
  }});
}

export async function deleteNetworkItem(type: string, id: string) {
  if (type === 'tunnel') return prisma.tunnelProfile.delete({ where: { id } });
  if (type === 'client') return prisma.clientProfile.delete({ where: { id } });
  return prisma.bypassRule.delete({ where: { id } });
}
