import {afterEach,describe,expect,it,vi} from 'vitest';
import {authenticate,issueDevelopmentToken} from '../src/auth.js';

afterEach(()=>vi.unstubAllEnvs());
describe('development authentication boundary',()=>{
  it('requires explicit enablement and rejects the same local token in production',async()=>{
    vi.stubEnv('NODE_ENV','development');vi.stubEnv('ENABLE_DEV_AUTH','true');
    const token=issueDevelopmentToken('dev-owner');expect(await authenticate(`Bearer ${token}`)).toBe('dev-owner');
    vi.stubEnv('NODE_ENV','production');await expect(authenticate(`Bearer ${token}`)).rejects.toMatchObject({status:401});
    expect(()=>issueDevelopmentToken('dev-owner')).toThrow();
  });
  it('rejects malformed and non-ASCII signature inputs as authentication failures',async()=>{
    vi.stubEnv('NODE_ENV','development');vi.stubEnv('ENABLE_DEV_AUTH','true');
    for(const token of ['local.abc.'+'é'.repeat(43),'local.abc.'+'a'.repeat(43)+'.extra','local..abc','local.abc.invalid'])await expect(authenticate(`Bearer ${token}`)).rejects.toMatchObject({status:401});
  });
  it('does not accept an unsigned identity or a missing authorization header',async()=>{
    await expect(authenticate()).rejects.toMatchObject({status:401});await expect(authenticate('owner')).rejects.toMatchObject({status:401});
  });
});
