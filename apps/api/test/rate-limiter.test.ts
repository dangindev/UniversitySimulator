import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {VerifiedRateLimiter} from '../src/rate-limiter.js';
import {issueDevelopmentToken} from '../src/auth.js';

beforeEach(()=>{vi.stubEnv('NODE_ENV','development');vi.stubEnv('ENABLE_DEV_AUTH','true');});
afterEach(()=>vi.unstubAllEnvs());
const ip='192.0.2.10';
describe('verified and separately scoped request limits',()=>{
  it('keeps login and liveness available after more than 120 authenticated requests from a shared IP',async()=>{
    const limiter=new VerifiedRateLimiter();
    for(let user=0;user<40;user++){
      const authorization=`Bearer ${issueDevelopmentToken(`dev-user-${user}`)}`;
      for(let request=0;request<5;request++)expect((await limiter.check({ip,path:'/api/v1/bootstrap',authorization})).allowed).toBe(true);
    }
    expect(await limiter.check({ip,path:'/api/v1/health',method:'GET'})).toMatchObject({allowed:true,scope:'health'});
    expect(await limiter.check({ip,path:'/api/v1/auth/dev',method:'POST'})).toMatchObject({allowed:true,scope:'anonymous'});
  });
  it('does not upgrade a forged Authorization header to the authenticated IP allowance',async()=>{
    const limiter=new VerifiedRateLimiter();const authorization='Bearer local.invalid.signature';
    for(let request=0;request<120;request++)expect(await limiter.check({ip,path:'/api/v1/auth/dev',method:'POST',authorization})).toMatchObject({allowed:true,scope:'anonymous'});
    expect(await limiter.check({ip,path:'/api/v1/auth/dev',method:'POST',authorization})).toMatchObject({allowed:false,scope:'anonymous'});
    // The same forged load must not exhaust a legitimate signed account's separate bucket.
    expect(await limiter.check({ip,path:'/api/v1/bootstrap',authorization:`Bearer ${issueDevelopmentToken('dev-legitimate')}`})).toMatchObject({allowed:true,scope:'authenticated',identity:'dev-legitimate'});
  });
  it('enforces 120 requests per verified user even when the user changes IP',async()=>{
    const limiter=new VerifiedRateLimiter();const authorization=`Bearer ${issueDevelopmentToken('dev-owner')}`;
    for(let request=0;request<120;request++)expect((await limiter.check({ip:request%2?'192.0.2.11':ip,path:'/api/v1/bootstrap',authorization})).allowed).toBe(true);
    expect(await limiter.check({ip:'192.0.2.12',path:'/api/v1/bootstrap',authorization})).toMatchObject({allowed:false,scope:'authenticated',identity:'dev-owner'});
  });
  it('retains the 6,000 verified-request IP ceiling without consuming the anonymous bucket',async()=>{
    const limiter=new VerifiedRateLimiter();
    for(let user=0;user<50;user++){
      const authorization=`Bearer ${issueDevelopmentToken(`dev-load-${user}`)}`;
      for(let request=0;request<120;request++)expect((await limiter.check({ip,path:'/api/v1/bootstrap',authorization})).allowed).toBe(true);
    }
    expect(await limiter.check({ip,path:'/api/v1/bootstrap',authorization:`Bearer ${issueDevelopmentToken('dev-extra')}`})).toMatchObject({allowed:false,scope:'authenticated'});
    expect(await limiter.check({ip,path:'/api/v1/auth/dev',method:'POST'})).toMatchObject({allowed:true,scope:'anonymous'});
  });
  it('does not let liveness probes consume login capacity or require token verification',async()=>{
    const verify=vi.fn(async()=>{throw new Error('not a token');});const limiter=new VerifiedRateLimiter(verify);
    for(let request=0;request<200;request++)expect((await limiter.check({ip,path:'/api/v1/health',method:'HEAD',authorization:'forged'})).allowed).toBe(true);
    expect(verify).not.toHaveBeenCalled();expect((await limiter.check({ip,path:'/api/v1/auth/dev',method:'POST'})).allowed).toBe(true);
  });
  it('resets each scope at the minute boundary',async()=>{
    let now=1000;const limiter=new VerifiedRateLimiter(undefined,()=>now);
    for(let request=0;request<120;request++)await limiter.check({ip,path:'/api/v1/auth/dev',method:'POST'});
    expect((await limiter.check({ip,path:'/api/v1/auth/dev',method:'POST'})).allowed).toBe(false);
    now+=60000;expect((await limiter.check({ip,path:'/api/v1/auth/dev',method:'POST'})).allowed).toBe(true);
  });
});
