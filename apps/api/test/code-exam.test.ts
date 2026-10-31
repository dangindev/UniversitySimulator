import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {programs} from '@university-simulator/core';
import {getLessons} from '@university-simulator/content';
import {createDevelopmentBank} from '../src/bank.js';
import {UniversityService,type Capabilities} from '../src/service.js';
import {SqliteStore} from '../src/store.js';
import {processSubmission} from '../src/queue.js';
import type {ProgrammingTrack} from '@university-simulator/core';

const capabilities:Capabilities={developmentAuth:true,assessmentMode:'development-samples',codeExecution:true,productionReady:false,curriculumVersion:'2026.v1',contentStatus:'draft'};
let store:SqliteStore;let service:UniversityService;let now:number;let bank:ReturnType<typeof createDevelopmentBank>;
const source='a, b = map(int, input().split())\nprint(a + b)\n';
const complete={execute:async()=>({passed:4,total:4,feedback:'All isolated tests passed.'})};

beforeEach(()=>{store=new SqliteStore(':memory:');bank=createDevelopmentBank();now=Date.parse('2026-11-01T00:00:00Z');service=new UniversityService(store,bank,capabilities,()=>now);});
afterEach(async()=>{vi.restoreAllMocks();vi.unstubAllEnvs();await store.close();});

async function prepare(id='owner',track:ProgrammingTrack='python'){
  await service.createStudent(id,{displayName:'Sinh viên kiểm thử',major:'it',track});
  await service.enroll(id,{courseIds:programs[0].recommendedPath[0]});
  for(const lesson of getLessons('intro-programming',track).filter(lesson=>lesson.checkpoint))await service.checkpoint(id,{courseId:'intro-programming',lessonId:lesson.id,answer:String(lesson.checkpoint!.answerIndex)});
  await store.mutateStudent(id,student=>{student.progress['intro-programming'].checkpointScores['verified-code']=10;});
  for(let i=1;i<16;i++)await service.advance(id,{unit:'week',confirm:true});
  const midterm=await service.startExam(id,{courseId:'intro-programming',kind:'midterm'});
  await service.saveExam(id,midterm.exam.id,{answers:Object.fromEntries(bank.assessments[0].questions.map(question=>[question.id,question.correctOption]))});
  await service.submitExam(id,midterm.exam.id,{idempotencyKey:'midterm-complete'});
}
async function start(id='owner'){return service.startExam(id,{courseId:'intro-programming',kind:'final'});}
function finalAnswers(code=source){return {...Object.fromEntries(bank.assessments.find(exam=>exam.kind==='final')!.questions.filter(question=>question.kind!=='code').map(question=>[question.id,question.correctOption])), 'intro-final-code':code};}
async function submit(id='owner'){
  const started=await start(id);await service.saveExam(id,started.exam.id,{answers:finalAnswers()});
  return service.submitExam(id,started.exam.id,{idempotencyKey:'submit-final'});
}

describe('timed programming assessment',()=>{
  it('does not start the timer without an isolated executor',async()=>{
    await prepare();const disabled=new UniversityService(store,bank,{...capabilities,codeExecution:false},()=>now);
    await expect(disabled.startExam('owner',{courseId:'intro-programming',kind:'final'})).rejects.toMatchObject({code:'execution_unavailable'});
    expect((await store.getStudent('owner'))!.exams.filter(exam=>exam.kind==='final')).toHaveLength(0);
  });
  it('checks worker health and capacity before creating an attempt',async()=>{
    await prepare();const unavailable=new UniversityService(store,bank,capabilities,()=>now,async()=>{throw new Error('Worker unavailable');});
    await expect(unavailable.startExam('owner',{courseId:'intro-programming',kind:'final'})).rejects.toThrow('Worker unavailable');
    vi.spyOn(store,'gradingBacklog').mockResolvedValue(100);
    await expect(start()).rejects.toMatchObject({code:'grading_capacity_unavailable'});
    expect((await store.getStudent('owner'))!.exams.filter(exam=>exam.kind==='final')).toHaveLength(0);
  });
  it('reserves the complete VM budget atomically with attempt creation',async()=>{
    await prepare();vi.stubEnv('EXECUTION_MONTHLY_SECONDS','44');
    await expect(start()).rejects.toMatchObject({code:'execution_budget_exhausted'});
    expect((await store.getStudent('owner'))!.exams.filter(exam=>exam.kind==='final')).toHaveLength(0);
    expect(await store.monthlyExecutionSeconds('2026-11')).toBe(0);
    vi.stubEnv('EXECUTION_MONTHLY_SECONDS','45');const started=await start();
    expect(started.exam.status).toBe('active');expect(await store.monthlyExecutionSeconds('2026-11')).toBe(45);
    await start();expect(await store.monthlyExecutionSeconds('2026-11')).toBe(45);
  });
  it('reserves both possible billing months when a timed attempt crosses a month boundary',async()=>{
    now=Date.parse('2026-10-31T23:59:30Z');await prepare();await start();
    expect(await store.monthlyExecutionSeconds('2026-10')).toBe(45);expect(await store.monthlyExecutionSeconds('2026-11')).toBe(45);
  });
  it('selects the correct C++ or Python exercise and does not expose private tests',async()=>{
    for(const track of ['cpp','python'] as const){
      await prepare(track,track);const started=await start(track);const code=started.exam.questions.find(question=>question.kind==='code')!;
      expect(code.language).toBe(track);expect(code.options).toHaveLength(0);expect(code.starterCode?.length).toBeGreaterThan(0);
      const serialized=JSON.stringify(started);expect(serialized).not.toContain('correctOption');expect(serialized).not.toContain('expected');expect(serialized).not.toContain('codeExerciseSnapshot');expect(serialized).not.toContain('exerciseIds');
    }
  });
  it('accepts and freezes source before the deadline, then grades after the deadline without penalizing queue delay',async()=>{
    await prepare();const started=await start();now=Date.parse(started.exam.deadlineAt)-1000;
    await service.saveExam('owner',started.exam.id,{answers:finalAnswers()});
    const accepted=await service.submitExam('owner',started.exam.id,{idempotencyKey:'on-time'});
    expect(accepted.exam.status).toBe('grading');expect(accepted.exam.score).toBeUndefined();
    expect(Date.parse(accepted.exam.acceptedAt!)).toBeLessThan(Date.parse(accepted.exam.deadlineAt));
    expect(accepted.student!.grades.find(grade=>grade.courseId==='intro-programming')).toBeUndefined();
    const submission=await store.getSubmission(accepted.exam.gradingSubmissionId!);expect(submission!.source).toBe(source);expect(submission!.acceptedAt).toBe(accepted.exam.acceptedAt);
    now=Date.parse(started.exam.deadlineAt)+600000;
    await processSubmission(submission!.id,store,bank,complete);
    const graded=await service.exam('owner',started.exam.id);expect(graded.exam.status).toBe('graded');expect(graded.exam.score).toBe(10);expect(graded.exam.acceptedAt).toBe(accepted.exam.acceptedAt);
    expect(graded.student!.grades.find(grade=>grade.courseId==='intro-programming')!.status).toBe('passed');
  });
  it('combines code test fraction with the published question weights',async()=>{
    await prepare();const accepted=await submit();
    await processSubmission(accepted.exam.gradingSubmissionId!,store,bank,{execute:async()=>({passed:1,total:4,feedback:'One test passed.'})});
    const graded=await service.exam('owner',accepted.exam.id);expect(graded.exam.score).toBe(7);expect(graded.exam.codeResult?.passed).toBe(1);
  });
  it('does not grant programming credits when all choices are correct but the essential code criterion failed',async()=>{
    await prepare();const accepted=await submit();
    await processSubmission(accepted.exam.gradingSubmissionId!,store,bank,{execute:async()=>({passed:0,total:4,feedback:'No code tests passed.'})});
    const graded=await service.exam('owner',accepted.exam.id);
    expect(graded.exam.score).toBe(6);expect(graded.exam.codeResult?.criterionPassed).toBe(false);
    const grade=graded.student!.grades.find(grade=>grade.courseId==='intro-programming')!;
    expect(grade.score).toBeGreaterThan(5);expect(grade.status).toBe('failed');expect(grade.reason).toContain('kiểm thử bắt buộc');expect(graded.student!.summary.credits).toBe(0);
    const retake=await start();await service.saveExam('owner',retake.exam.id,{answers:finalAnswers()});
    const retry=await service.submitExam('owner',retake.exam.id,{idempotencyKey:'valid-code-retake'});
    await processSubmission(retry.exam.gradingSubmissionId!,store,bank,{execute:async()=>({passed:2,total:4,feedback:'Half the code tests passed.'})});
    const repaired=await service.exam('owner',retake.exam.id);expect(repaired.exam.codeResult?.criterionPassed).toBe(true);
    expect(repaired.student!.grades.find(grade=>grade.courseId==='intro-programming')!.status).toBe('passed');expect(repaired.student!.summary.credits).toBe(4);
  });
  it('does not start a new executor while the persistent operational pause is active',async()=>{
    await prepare();const accepted=await submit();let executed=false;
    await expect(processSubmission(accepted.exam.gradingSubmissionId!,store,bank,{execute:async()=>{executed=true;return {passed:4,total:4,feedback:'unexpected'};}},{configured:true,isPaused:async()=>true,setPaused:async()=>undefined})).rejects.toMatchObject({code:'execution_paused'});
    expect(executed).toBe(false);expect((await store.getSubmission(accepted.exam.gradingSubmissionId!))!.status).toBe('queued');
  });
  it('uses only the last acknowledged source when a save arrives after the deadline',async()=>{
    await prepare();const started=await start();await service.saveExam('owner',started.exam.id,{answers:finalAnswers(source)});
    now=Date.parse(started.exam.deadlineAt)+1;
    const late=await service.saveExam('owner',started.exam.id,{answers:finalAnswers('print("late replacement")')});
    expect(late.expired).toBe(true);expect(late.exam.status).toBe('grading');
    expect((await store.getSubmission(late.exam.gradingSubmissionId!))!.source).toBe(source);
    await expect(service.saveExam('owner',started.exam.id,{answers:finalAnswers('another replacement')})).rejects.toMatchObject({status:409});
  });
  it('freezes the grading data and test cases when the attempt starts',async()=>{
    await prepare();const started=await start();
    bank.exercises.find(exercise=>exercise.id==='intro-sum-python')!.tests[0].expected='wrong mutated expectation';
    bank.assessments.find(exam=>exam.kind==='final')!.questions[0].correctOption='0';
    await service.saveExam('owner',started.exam.id,{answers:{...finalAnswers(),variable:'1'}});
    const accepted=await service.submitExam('owner',started.exam.id,{idempotencyKey:'frozen-bank'});
    await processSubmission(accepted.exam.gradingSubmissionId!,store,{...bank,version:'new-bank-version'},{execute:async(_submission,exercise)=>{expect(exercise.tests[0].expected).toBe('5');return {passed:4,total:4,feedback:'Frozen tests passed.'};}});
    expect((await service.exam('owner',started.exam.id)).exam.score).toBe(10);
  });
  it('does not create duplicate submissions or scores on concurrent submit and job deliveries',async()=>{
    await prepare();const started=await start();await service.saveExam('owner',started.exam.id,{answers:finalAnswers()});
    const [first,second]=await Promise.all([service.submitExam('owner',started.exam.id,{idempotencyKey:'first'}),service.submitExam('owner',started.exam.id,{idempotencyKey:'second'})]);
    expect(first.exam.gradingSubmissionId).toBe(second.exam.gradingSubmissionId);expect(await store.gradingBacklog()).toBe(1);
    let calls=0;const executor={execute:async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,10));return {passed:4,total:4,feedback:'Done'};}};
    await Promise.all([processSubmission(first.exam.gradingSubmissionId!,store,bank,executor),processSubmission(first.exam.gradingSubmissionId!,store,bank,executor)]);
    expect(calls).toBe(1);expect((await store.getStudent('owner'))!.grades.filter(grade=>grade.courseId==='intro-programming')).toHaveLength(1);
  });
  it('recovers the accepted attempt outbox after a crash between source acceptance and submission creation',async()=>{
    await prepare();const started=await start();await service.saveExam('owner',started.exam.id,{answers:finalAnswers()});
    const failedDispatch=vi.spyOn(store,'enqueueSubmission').mockRejectedValueOnce(new Error('Simulated crash after attempt commit'));
    const accepted=await service.submitExam('owner',started.exam.id,{idempotencyKey:'accepted-before-crash'});
    expect(accepted.exam.status).toBe('grading');expect(await store.getSubmission(accepted.exam.gradingSubmissionId!)).toBeNull();
    expect((await store.getStudent('owner'))!.exams.find(exam=>exam.id===started.exam.id)!.gradingDispatchPending).toBe(true);
    failedDispatch.mockRestore();const restarted=new UniversityService(store,bank,capabilities,()=>now);
    await restarted.reconcileExams('owner');const recovered=await store.getSubmission(accepted.exam.gradingSubmissionId!);
    expect(recovered!.source).toBe(source);expect(recovered!.acceptedAt).toBe(accepted.exam.acceptedAt);expect(await store.monthlyExecutionSeconds('2026-11')).toBe(45);
    await processSubmission(recovered!.id,store,bank,complete);expect((await restarted.exam('owner',started.exam.id)).exam.score).toBe(10);
  });
  it('does not execute source twice after the result was saved but grade application failed',async()=>{
    await prepare();const accepted=await submit();let calls=0;
    const executor={execute:async()=>{calls++;return {passed:4,total:4,feedback:'Persisted result'};}};
    const failedApply=vi.spyOn(store,'mutateStudent').mockRejectedValueOnce(new Error('Simulated crash after result commit'));
    await expect(processSubmission(accepted.exam.gradingSubmissionId!,store,bank,executor)).rejects.toThrow('Simulated crash');
    failedApply.mockRestore();await processSubmission(accepted.exam.gradingSubmissionId!,store,bank,executor);
    expect(calls).toBe(1);expect((await service.exam('owner',accepted.exam.id)).exam.score).toBe(10);
  });
  it('keeps a system failure separate from a student failure and permits an operator retry of the frozen source',async()=>{
    await prepare();const accepted=await submit();
    await processSubmission(accepted.exam.gradingSubmissionId!,store,bank,{execute:async()=>{throw new Error('Provider outage');}});
    const errored=await service.exam('owner',accepted.exam.id);expect(errored.exam.status).toBe('grading-error');expect(errored.exam.score).toBeUndefined();
    expect(errored.student!.grades.find(grade=>grade.courseId==='intro-programming')).toBeUndefined();
    await expect(service.advance('owner',{unit:'semester',confirm:true})).rejects.toMatchObject({status:409});
    await service.retryExamGrading('owner',accepted.exam.id,'INC-001 provider restored');
    const retry=await service.exam('owner',accepted.exam.id);expect(retry.exam.gradingSubmissionId).not.toBe(accepted.exam.gradingSubmissionId);
    expect((await store.getSubmission(retry.exam.gradingSubmissionId!))!.source).toBe(source);expect(retry.exam.acceptedAt).toBe(accepted.exam.acceptedAt);
    await processSubmission(retry.exam.gradingSubmissionId!,store,bank,complete);expect((await service.exam('owner',accepted.exam.id)).exam.score).toBe(10);
    expect(await store.monthlyExecutionSeconds('2026-11')).toBe(90);
  });
  it('does not advance the semester while an accepted code exam is waiting for its worker',async()=>{
    await prepare();const accepted=await submit();
    await expect(service.advance('owner',{unit:'semester',confirm:true})).rejects.toMatchObject({status:409});
    expect((await store.getStudent('owner'))!.semester).toBe(1);expect((await store.getSubmission(accepted.exam.gradingSubmissionId!))!.status).toBe('queued');
  });
});
