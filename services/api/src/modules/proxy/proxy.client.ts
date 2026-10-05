import createError from 'http-errors';

import { env } from '../../config/env.js';

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.PROXY_PROVISIONER_KEY}`,
  };
}

export async function provisionProxyUser(uuid: string, email: string) {
  let response: Response;
  try {
    response = await fetch(`${env.PROXY_PROVISIONER_URL}/v1/users`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ uuid, email }),
    });
  } catch {
    throw createError(503, 'Proxy gateway provisioning unavailable');
  }
  if (!response.ok) {
    throw createError(502, 'Proxy gateway provisioning failed');
  }
  const result = (await response.json()) as { success?: boolean };
  if (!result.success) {
    throw createError(502, 'Invalid proxy gateway provisioning response');
  }
}

export async function revokeProxyUser(uuid: string) {
  let response: Response;
  try {
    response = await fetch(
      `${env.PROXY_PROVISIONER_URL}/v1/users/${encodeURIComponent(uuid)}`,
      { method: 'DELETE', headers: headers() },
    );
  } catch {
    throw createError(503, 'Proxy gateway provisioning unavailable');
  }
  if (!response.ok) {
    throw createError(502, 'Proxy gateway revoke failed');
  }
}
