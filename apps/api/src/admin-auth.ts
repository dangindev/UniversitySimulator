import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { ApiError } from './types.js';

export interface AdminActor {
  readonly id: string;
  readonly role: 'admin';
  readonly aal: 'aal2';
  readonly issuer: string;
  readonly expiresAt: number;
}
export type AdminTokenVerifier = (token: string, expected: { issuer: string; audience: 'authenticated' }) => Promise<JWTPayload>;
export interface AdminVerificationTestOptions { verifyToken?: AdminTokenVerifier; issuer?: string }

const verifiedActors = new WeakSet<object>();
const issuerKeys = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

/** A branded, frozen result prevents accidentally accepting an actor copied from a request body. */
export function assertVerifiedAdminActor(actor: unknown): asserts actor is AdminActor {
  if (!actor || typeof actor !== 'object' || !verifiedActors.has(actor) || (actor as AdminActor).expiresAt <= Date.now()) {
    throw new ApiError(403, 'Thao tác yêu cầu phiên quản trị đã xác minh MFA.', 'admin_identity_required');
  }
}

/** Admin role comes only from signed app_metadata, never editable user_metadata or a local token. */
export async function verifyAdminIdentity(header?: string, testOptions?: AdminVerificationTestOptions): Promise<AdminActor> {
  const hasTestOptions = testOptions?.verifyToken !== undefined || testOptions?.issuer !== undefined;
  if (hasTestOptions && process.env.VITEST !== 'true' && process.env.NODE_ENV !== 'test') {
    throw new ApiError(503, 'Bộ xác minh thử nghiệm bị cấm ngoài môi trường kiểm thử.', 'test_verifier_forbidden');
  }
  if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'Bạn cần đăng nhập quản trị.', 'authentication_required');
  const token = header.slice(7);
  if (!token || token.length > 16384 || /\s/.test(token) || token.startsWith('local.')) throw new ApiError(401, 'Phiên quản trị không hợp lệ.', 'invalid_admin_session');
  const configuredIssuer = process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1` : undefined;
  const issuer = testOptions?.issuer ?? configuredIssuer;
  if (!issuer) throw new ApiError(503, 'Chưa cấu hình xác thực quản trị Supabase.', 'admin_auth_unavailable');
  let payload: JWTPayload;
  try {
    if (testOptions?.verifyToken) payload = await testOptions.verifyToken(token, { issuer, audience: 'authenticated' });
    else {
      let keys = issuerKeys.get(issuer);
      if (!keys) { keys = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)); issuerKeys.set(issuer, keys); }
      payload = (await jwtVerify(token, keys, { issuer, audience: 'authenticated', algorithms: ['ES256', 'RS256'] })).payload;
    }
    // Explicitly require expiration even if a custom verifier or an unusual signed token omitted it.
    if (payload.iss !== issuer || !(payload.aud === 'authenticated' || Array.isArray(payload.aud) && payload.aud.includes('authenticated')) || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128 || payload.role !== 'authenticated' || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) throw new Error('invalid claims');
  } catch { throw new ApiError(401, 'Phiên quản trị không hợp lệ hoặc đã hết hạn.', 'invalid_admin_session'); }
  const metadata = payload.app_metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || (metadata as Record<string, unknown>).role !== 'admin') throw new ApiError(403, 'Tài khoản không có quyền quản trị.', 'admin_role_required');
  if (payload.aal !== 'aal2') throw new ApiError(403, 'Cần xác minh MFA trước khi quản trị.', 'admin_mfa_required');
  const actor: AdminActor = Object.freeze({ id: payload.sub!, role: 'admin', aal: 'aal2', issuer, expiresAt: payload.exp! * 1000 });
  verifiedActors.add(actor);
  return actor;
}
