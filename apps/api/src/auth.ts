import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ApiError } from './types.js';

const developmentSecret = randomBytes(32);
export function developmentAuthEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_AUTH === 'true';
}
export function issueDevelopmentToken(userId: string) {
  if (!developmentAuthEnabled()) throw new ApiError(404, 'Đăng nhập phát triển bị tắt.');
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url');
  const signature = createHmac('sha256', developmentSecret).update(payload).digest('base64url');
  return `local.${payload}.${signature}`;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
export async function authenticate(header?: string): Promise<string> {
  if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'Bạn cần đăng nhập.', 'authentication_required');
  const token = header.slice(7);
  if (token.startsWith('local.')) {
    if (!developmentAuthEnabled()) throw new ApiError(401, 'Phiên đăng nhập không hợp lệ.');
    const parts=token.split('.');
    if(parts.length!==3)throw new ApiError(401,'Phiên đăng nhập không hợp lệ.');
    const [, payload = '', signature = ''] = parts;
    if(!/^[A-Za-z0-9_-]{1,2048}$/.test(payload)||!/^[A-Za-z0-9_-]{43}$/.test(signature))throw new ApiError(401,'Phiên đăng nhập không hợp lệ.');
    const expected = createHmac('sha256', developmentSecret).update(payload).digest('base64url');
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new ApiError(401, 'Phiên đăng nhập không hợp lệ.');
    try {
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub: string; exp: number };
      if (!parsed.sub || parsed.exp < Date.now() / 1000) throw new Error('expired');
      return parsed.sub;
    } catch { throw new ApiError(401, 'Phiên đăng nhập đã hết hạn.'); }
  }
  if (!process.env.SUPABASE_URL) throw new ApiError(503, 'Chưa cấu hình dịch vụ đăng nhập.');
  try {
    const issuer = `${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1`;
    jwks ??= createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token, jwks, { issuer, audience: 'authenticated' });
    if (!payload.sub || payload.role !== 'authenticated') throw new Error('invalid subject');
    return payload.sub;
  } catch { throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.', 'invalid_session'); }
}
