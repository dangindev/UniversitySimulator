import {ApiError} from './types.js';
import type {Store} from './store.js';
import type {AssessmentBank} from './bank.js';
import {DockerExecutionAdapter,type DockerAvailability} from './docker-execution.js';
import {processSubmission} from './queue.js';
import type {ExecutionControl} from './admin-operations.js';

export function createLocalExecutionControl(store:Store):ExecutionControl{
  return {configured:true,isPaused:()=>store.executionPaused(),setPaused:paused=>store.setExecutionPaused(paused)};
}
export async function localGradingPreflight(adapter:DockerExecutionAdapter,control:ExecutionControl){
  if(process.env.NODE_ENV==='production')throw new ApiError(503,'Docker local không được sử dụng ở production.','local_execution_forbidden');
  const available=await adapter.probe();
  if(!available.available)throw new ApiError(503,available.reason,'local_execution_unavailable');
  if(await control.isPaused())throw new ApiError(503,'Chấm bài local đang tạm dừng để xử lý sự cố.','execution_paused');
}

/** Development-only SQLite/Postgres durable queue consumer; no Redis or paid provider is needed. */
export function startLocalGrader(store:Store,bank:AssessmentBank,adapter:DockerExecutionAdapter,control:ExecutionControl,onAvailability:(status:DockerAvailability)=>void,concurrency=2){
  if(process.env.NODE_ENV==='production')throw new Error('Local queue workers are forbidden in production.');
  const maximum=Math.max(1,Math.min(2,concurrency));
  const active=new Map<string,Promise<void>>();let busy=false,closing=false;
  const tick=async()=>{
    if(busy||closing)return;busy=true;
    try{
      const status=await adapter.probe();onAvailability(status);
      // Scanning also recovers expired execution leases, even while the engine is temporarily offline.
      const pending=await store.pendingSubmissions();
      if(!status.available||await control.isPaused())return;
      for(const submission of pending){
        if(active.size>=maximum)break;if(active.has(submission.id))continue;
        const work=processSubmission(submission.id,store,bank,adapter,control).catch(()=>{
          // Source and durable job state stay in the store; a retry never becomes a fabricated grade.
        }).finally(()=>{active.delete(submission.id);});
        active.set(submission.id,work);
      }
    }finally{busy=false;}
  };
  const timer=setInterval(()=>void tick().catch(()=>undefined),500);timer.unref();void tick().catch(()=>undefined);
  return {tick,activeCount:()=>active.size,close:async()=>{closing=true;clearInterval(timer);await Promise.allSettled([...active.values()]);}};
}
