import {authenticate} from './auth.js';

export interface RateLimitRequest {
  ip:string;
  path:string;
  method?:string;
  authorization?:string;
}
export interface RateLimitDecision {
  allowed:boolean;
  scope:'health'|'anonymous'|'authenticated';
  identity?:string;
  retryAfterSeconds?:number;
}
interface Window {count:number;until:number}

/** Separate IP scopes prevent authenticated traffic from consuming anonymous login capacity. */
export class VerifiedRateLimiter {
  private readonly windows=new Map<string,Window>();
  constructor(
    readonly verify:(authorization?:string)=>Promise<string>=authenticate,
    readonly now:()=>number=Date.now,
  ){}
  private consume(key:string,maximum:number,now:number){
    let window=this.windows.get(key);
    if(!window||window.until<=now){window={count:0,until:now+60000};this.windows.set(key,window);}
    window.count++;
    return {allowed:window.count<=maximum,retryAfterSeconds:Math.max(1,Math.ceil((window.until-now)/1000))};
  }
  async check(request:RateLimitRequest):Promise<RateLimitDecision>{
    // Liveness is cheap and must remain reachable when a shared proxy/NAT is busy.
    if(['GET','HEAD'].includes(request.method??'GET')&&/^\/api\/v1\/health\/?$/.test(request.path))return {allowed:true,scope:'health'};
    let identity:string|undefined;
    if(request.authorization){
      try{const verified=await this.verify(request.authorization);if(typeof verified==='string'&&verified.length)identity=verified;}
      catch{/* Unverified headers never acquire the authenticated allowance. Route guards still enforce access. */}
    }
    const now=this.now();
    if(this.windows.size>10000)for(const[key,value]of this.windows)if(value.until<=now)this.windows.delete(key);
    const scope=identity?'authenticated':'anonymous';
    const ipLimit=this.consume(`${scope}:ip:${request.ip}`,identity?6000:120,now);
    if(!ipLimit.allowed)return {allowed:false,scope,identity,retryAfterSeconds:ipLimit.retryAfterSeconds};
    if(identity){
      const userLimit=this.consume(`authenticated:user:${identity}`,120,now);
      if(!userLimit.allowed)return {allowed:false,scope,identity,retryAfterSeconds:userLimit.retryAfterSeconds};
    }
    return {allowed:true,scope,identity};
  }
}
