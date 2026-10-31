import { Queue, Worker } from 'bullmq';
import type { AssessmentBank } from './bank.js';
import type { ExecutionAdapter } from './execution.js';
import type { Store } from './store.js';
import {calculateProjectGrade,getCourse} from '@university-simulator/core';
import {randomUUID} from 'node:crypto';
import {applyExamSubmission,recordCourseGrade} from './assessment.js';
import {introPracticeScores} from './intro-practice.js';
import {ApiError} from './types.js';
import {createRedisExecutionControl,type ExecutionControl} from './admin-operations.js';

export const GRADING_QUEUE = 'university-grading-v1';
export function redisConnection() {
  const url = new URL(process.env.REDIS_URL!);
  return {
    host:url.hostname,port:Number(url.port||6379),username:url.username||undefined,password:decodeURIComponent(url.password)||undefined,
    tls:url.protocol==='rediss:'?{}:undefined,maxRetriesPerRequest:null,
  };
}

export async function processSubmission(id:string,store:Store,bank:AssessmentBank,executor:ExecutionAdapter,control?:ExecutionControl|null) {
  const existing=await store.getSubmission(id);
  if(!existing||existing.progressApplied)return;
  if(existing.status==='error'){
    if(existing.examId){await store.mutateStudent(existing.userId,student=>applyExamSubmission(student,existing));await store.updateSubmission(id,submission=>{submission.progressApplied=true;});}
    return;
  }
  const applyProgress=async(result:NonNullable<typeof existing.result>)=>{
    await store.mutateStudent(existing.userId,student=>{
      if(existing.examId){applyExamSubmission(student,{...existing,status:result.passed===result.total?'passed':'failed',result});return;}
      if(student.semester!==existing.semester)return;
      const progress=student.progress[existing.courseId];
      if(!progress)return;
      progress.checkpointScores??={};
      progress.checkpointScores[`code:${existing.exerciseId}`]=Math.max(progress.checkpointScores[`code:${existing.exerciseId}`]??0,result.passed/result.total*10);
      if(result.passed===result.total)progress.checkpointScores['verified-code']=10;
      progress.practice=existing.courseId==='intro-programming'?introPracticeScores(student).values:Object.values(progress.checkpointScores);
      const exercise=bank.exercises.find(item=>item.id===existing.exerciseId);
      if(exercise?.projectStage&&getCourse(existing.courseId)?.kind==='project'){
        const stageKey=`project-stage-${exercise.projectStage}`;
        progress.checkpointScores[stageKey]=Math.max(progress.checkpointScores[stageKey]??0,result.passed/result.total*10);
        const stages=[1,2,3].map(stage=>progress.checkpointScores[`project-stage-${stage}`]);
        if(stages.every(score=>score!==undefined)){
          const grade=calculateProjectGrade(stages as [number,number,number]);
          const record={courseId:existing.courseId,semester:existing.semester,status:grade.passed?'passed' as const:'failed' as const,score:grade.score};
          const previous=student.grades.find(item=>item.courseId===existing.courseId&&item.semester===existing.semester);
          if(previous)Object.assign(previous,record);else student.grades.push(record);
        }
      }
      if(existing.courseId==='intro-programming')recordCourseGrade(student,existing.courseId);
    });
    await store.updateSubmission(id,submission=>{submission.progressApplied=true;});
  };
  if(existing.result&&['passed','failed'].includes(existing.status)){await applyProgress(existing.result);return;}
  if(!existing.examId&&existing.assessmentVersion!==bank.version){
    await store.updateSubmission(id,submission=>{submission.status='error';submission.completedAt=new Date().toISOString();submission.result={passed:0,total:0,feedback:'Phiên bản bộ chấm của bài nộp chưa khả dụng. Mã nguồn đã được giữ lại; cần khôi phục đúng bộ chấm, không tự đổi sang đáp án mới.'};});return;
  }
  const examOwner=existing.examId?await store.getStudent(existing.userId):null;
  const snapshot=examOwner?.exams.find(exam=>exam.id===existing.examId)?.codeExerciseSnapshot;
  if(existing.examId){
    const attempt=examOwner?.exams.find(exam=>exam.id===existing.examId);
    if(!attempt||attempt.status==='void'||attempt.gradingSubmissionId!==existing.id){await store.updateSubmission(id,submission=>{submission.status='error';submission.progressApplied=true;submission.result={passed:0,total:0,feedback:'Lượt thi đã được hủy hoặc thay thế; không mở phiên thực thi mới.'};});return;}
  }
  const exercise=existing.examId?snapshot:bank.exercises.find(item=>item.id===existing.exerciseId&&item.courseId===existing.courseId&&item.language===existing.language);
  if(!exercise){
    await store.updateSubmission(id,submission=>{submission.status='error';submission.completedAt=new Date().toISOString();submission.result={passed:0,total:0,feedback:'Bài tập của phiên bản bộ chấm chưa khả dụng. Mã nguồn vẫn được lưu; đây không phải điểm trượt.'};});return;
  }
  const claim=randomUUID();
  if(control?.configured&&await control.isPaused())throw new ApiError(503,'Thực thi mới đang tạm dừng để xử lý sự cố.','execution_paused');
  const claimed=await store.claimSubmission(id,claim,new Date(Date.now()+(exercise.timeoutSeconds+75)*1000).toISOString());
  if(!claimed)return;
  let result;
  try {
    result=await executor.execute(existing,exercise);
  }catch{
    const current=await store.getSubmission(id);if(current?.status!=='running'||current.executionClaim!==claim)return;
    const failed=await store.updateSubmission(id,submission=>{
      submission.status='error';submission.completedAt=new Date().toISOString();
      submission.result={passed:0,total:exercise.tests.length,feedback:'Dịch vụ chấm gặp sự cố. Bài nộp đã được lưu; lỗi hệ thống không được tính là điểm trượt.'};
    });
    if(existing.examId)await store.mutateStudent(existing.userId,student=>applyExamSubmission(student,failed));
    return;
  }
  const current=await store.getSubmission(id);if(current?.status!=='running'||current.executionClaim!==claim)return;
  await store.updateSubmission(id,submission=>{
    submission.status=result.passed===result.total?'passed':'failed';submission.result=result;submission.completedAt=new Date().toISOString();
  });
  // If persistence fails here, the queue retries using the saved result, without re-running learner code.
  await applyProgress(result);
}

export async function startGradingWorker(store:Store,bank:AssessmentBank,executor:ExecutionAdapter) {
  if(!process.env.REDIS_URL)throw new Error('REDIS_URL is required for the grading worker.');
  const connection=redisConnection();
  const queue=new Queue(GRADING_QUEUE,{connection});
  await queue.setGlobalConcurrency(10);
  const control=createRedisExecutionControl();
  const worker=new Worker(GRADING_QUEUE,async job=>processSubmission(String(job.data.submissionId),store,bank,executor,control),{connection,concurrency:10});
  worker.on('error',error=>console.error('Grading worker connection failure:',error.message));
  const client=await queue.client;
  const heartbeat=async()=>{await client.set('university:grader:heartbeat',new Date().toISOString(),{EX:20});};
  await heartbeat();const timer=setInterval(()=>void heartbeat().catch(()=>undefined),5000);timer.unref();
  return {worker,queue,close:async()=>{clearInterval(timer);await worker.close();await queue.close();await control?.close?.();}};
}

export async function gradingPreflight(suppliedControl?:ExecutionControl|null){
  if(!process.env.REDIS_URL)throw new ApiError(503,'Chưa có hàng đợi chấm bài.','grading_capacity_unavailable');
  const queue=new Queue(GRADING_QUEUE,{connection:{...redisConnection(),maxRetriesPerRequest:1,connectTimeout:1000,enableOfflineQueue:false,retryStrategy:()=>null}});
  const control=suppliedControl??createRedisExecutionControl();
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{
    await Promise.race([(async()=>{
      if(!control?.configured||await control.isPaused())throw new ApiError(503,'Thực thi mới đang tạm dừng; chưa bắt đầu tính giờ thi.','execution_paused');
      const client=await queue.client;const healthy=await client.get('university:grader:heartbeat');
      if(!healthy||await queue.isPaused())throw new ApiError(503,'Dịch vụ chấm chưa sẵn sàng; chưa bắt đầu tính giờ thi.','grading_capacity_unavailable');
    })(),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new ApiError(503,'Kiểm tra năng lực chấm quá hạn; kỳ thi chưa bắt đầu.','grading_capacity_unavailable')),2000);})]);
  }catch(error){if(error instanceof ApiError)throw error;throw new ApiError(503,'Chưa thể kiểm tra năng lực chấm; kỳ thi chưa bắt đầu.','grading_capacity_unavailable');}
  finally{if(timeout)clearTimeout(timeout);await queue.disconnect().catch(()=>undefined);if(!suppliedControl)await control?.close?.();}
}

export function startOutboxDispatcher(store:Store,suppliedControl?:ExecutionControl|null) {
  if(!process.env.REDIS_URL)return {close:async()=>undefined};
  const queue=new Queue(GRADING_QUEUE,{connection:redisConnection()});
  const control=suppliedControl??createRedisExecutionControl();
  let busy=false;
  const dispatch=async()=>{
    if(busy)return;busy=true;
    try {
      if(!control?.configured||await control.isPaused())return;
      for(const submission of await store.pendingSubmissions()){
        const existing=await queue.getJob(submission.id);
        if(existing){
          const state=await existing.getState();
          if(!['completed','failed','unknown'].includes(state))continue;
          await existing.remove();
        }
        await queue.add('grade',{submissionId:submission.id},{jobId:submission.id,attempts:3,backoff:{type:'exponential',delay:2000},removeOnComplete:1000,removeOnFail:1000});
        await store.markDispatched(submission.id);
      }
    }catch(error){console.error('Grading dispatch unavailable:',(error as Error).message);}finally{busy=false;}
  };
  const timer=setInterval(()=>void dispatch(),1500);timer.unref();void dispatch();
  return {close:async()=>{clearInterval(timer);await queue.close();if(!suppliedControl)await control?.close?.();}};
}
