import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, verifyTokenMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
    },
  },
  verifyTokenMock: vi.fn(),
}));

vi.mock('../../config/database.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../../modules/auth/jwt.js', () => ({
  verifyToken: verifyTokenMock,
}));

import { authMiddleware } from '../auth.middleware.js';
import { requirePermission, requireRole } from '../permission.middleware.js';

function request(headers: Record<string, string> = {}, user?: unknown) {
  return {
    headers,
    user,
  } as never;
}

describe('Phase 12 — authentication security regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects requests without an authorization token', async () => {
    await expect(authMiddleware(request(), {} as never)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Missing authorization token',
    });
  });

  it('rejects malformed authorization headers', async () => {
    await expect(
      authMiddleware(request({ authorization: 'Basic token' }), {} as never),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid authorization format',
    });
  });

  it('rejects invalid or expired tokens', async () => {
    verifyTokenMock.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await expect(
      authMiddleware(request({ authorization: 'Bearer expired-token' }), {} as never),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid or expired token',
    });
  });

  it('rejects inactive users even when the token is valid', async () => {
    verifyTokenMock.mockReturnValue({ id: 'user-1' });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      status: 'disabled',
      role: null,
    });

    await expect(
      authMiddleware(request({ authorization: 'Bearer valid-token' }), {} as never),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'User not found or inactive',
    });
  });

  it('loads the current database role and permissions for a valid active token', async () => {
    verifyTokenMock.mockReturnValue({ id: 'user-1' });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      status: 'active',
      role: {
        id: 'role-user',
        name: 'USER',
        permissions: [{ permission: { name: 'device:read' } }],
      },
    });

    const req = request({ authorization: 'Bearer valid-token' });
    await authMiddleware(req, {} as never);

    expect(req.user).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      role: 'USER',
      permissions: ['device:read'],
    });
  });
});

describe('Phase 12 — authorization and RBAC regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects permission checks without an authenticated user', async () => {
    await expect(requirePermission('device:read')(request(), {} as never)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Authentication required',
    });
  });

  it('rejects permission escalation when the role lacks the requested permission', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: {
        permissions: [{ permission: { name: 'device:read' } }],
      },
    });

    await expect(
      requirePermission('device:revoke')(request({}, { id: 'user-1' }), {} as never),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Permission denied',
    });
  });

  it('allows a permission explicitly granted to the current role', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: {
        permissions: [{ permission: { name: 'device:read' } }],
      },
    });

    await expect(
      requirePermission('device:read')(request({}, { id: 'user-1' }), {} as never),
    ).resolves.toBeUndefined();
  });

  it('rejects role escalation when the current role is not allowed', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: { name: 'USER' },
    });

    await expect(
      requireRole('ADMIN')(request({}, { id: 'user-1' }), {} as never),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Role denied',
    });
  });

  it('allows a role explicitly included by the authorization policy', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: { name: 'ADMIN' },
    });

    await expect(
      requireRole('ADMIN')(request({}, { id: 'user-1' }), {} as never),
    ).resolves.toBeUndefined();
  });
});
