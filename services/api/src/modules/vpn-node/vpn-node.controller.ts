import type { FastifyRequest } from 'fastify';

import {
  addVPNNode,
  editVPNNode,
  getVPNNode,
  getVPNNodes,
  setVPNNodeStatus,
} from './vpn-node.service.js';

export async function listVPNNodesController() {
  return getVPNNodes();
}

export async function getVPNNodeController(request: FastifyRequest) {
  const { id } = request.params as {
    id: string;
  };

  return getVPNNode(id);
}

export async function createVPNNodeController(request: FastifyRequest) {
  const body = request.body as {
    name: string;
    hostname: string;
    port?: number;
    protocol?: string;
    publicKey?: string;
    provisioningUrl?: string;
    provisioningKey?: string;
  };

  return addVPNNode(body);
}

export async function updateVPNNodeController(request: FastifyRequest) {
  const { id } = request.params as {
    id: string;
  };

  const body = request.body as {
    name?: string;
    hostname?: string;
    port?: number;
    protocol?: string;
    publicKey?: string;
    provisioningUrl?: string;
    provisioningKey?: string;
    active?: boolean;
  };

  return editVPNNode(id, body);
}

export async function toggleVPNNodeController(request: FastifyRequest) {
  const { id } = request.params as {
    id: string;
  };

  const body = request.body as {
    active: boolean;
  };

  return setVPNNodeStatus(id, body.active);
}
