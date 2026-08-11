import createError from 'http-errors';

export type ProvisionPeerInput = {
  publicKey: string;
  address: string;
};

export type ProvisionPeerResult = {
  success: boolean;
  publicKey: string;
  endpoint: string;
};

function getProvisioningHeaders(provisioningKey: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${provisioningKey}`,
  };
}

export async function provisionWireGuardPeer(
  provisioningUrl: string,
  provisioningKey: string,
  input: ProvisionPeerInput,
): Promise<ProvisionPeerResult> {
  let response: Response;

  try {
    response = await fetch(`${provisioningUrl}/v1/peers`, {
      method: 'POST',
      headers: getProvisioningHeaders(provisioningKey),
      body: JSON.stringify(input),
    });
  } catch {
    throw createError(503, 'VPN node provisioning unavailable');
  }

  if (!response.ok) {
    throw createError(502, 'VPN node provisioning failed');
  }

  const result = (await response.json()) as ProvisionPeerResult;

  if (!result.success || !result.endpoint) {
    throw createError(502, 'Invalid VPN node provisioning response');
  }

  return result;
}

export async function revokeWireGuardPeer(
  provisioningUrl: string,
  provisioningKey: string,
  publicKey: string,
) {
  let response: Response;

  try {
    response = await fetch(`${provisioningUrl}/v1/peers/${encodeURIComponent(publicKey)}`, {
      method: 'DELETE',
      headers: getProvisioningHeaders(provisioningKey),
    });
  } catch {
    throw createError(503, 'VPN node provisioning unavailable');
  }

  if (!response.ok) {
    throw createError(502, 'VPN node peer revoke failed');
  }
}
