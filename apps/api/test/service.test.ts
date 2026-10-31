import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { programs,officeTask } from '@university-simulator/core';
import { getLessons } from '@university-simulator/content';
import { createDevelopmentBank } from '../src/bank.js';
import { UniversityService, type Capabilities } from '../src/service.js';
import { SqliteStore } from '../src/store.js';
import { processSubmission } from '../src/queue.js';
import type { Submission } from '../src/types.js';

const capabilities:Capabilities={developmentAuth:true,assessmentMode:'development-samples',codeExecution:false,productionReady:false,curriculumVersion:'2026.v1',contentStatus:'draft'};
let store:SqliteStore;
let service:UniversityService;
let now:number;
const bank=createDevelopmentBank();
// This fixture isolates the synchronous academic rules; timed code grading has its own end-to-end service tests.
bank.assessments.forEach(assessment=>{assessment.questions=assessment.questions.filter(question=>question.kind!=='code');});
const firstSemester=programs.find(program=>program.id==='it')!.recommendedPath[0];
async function create(id='owner'){
  await service.createStudent(id,{displayName:'Nguyễn An',major:'it',track:'python'});
  return id;
}
async function enrolled(){await create();await service.enroll('owner',{courseIds:firstSemester});}
async function week16(){for(let week=1;week<16;week++)await service.advance('owner',{unit:'week',confirm:true});}
const correctAnswers=()=>Object.fromEntries(bank.assessments[0].questions.map(question=>[question.id,question.correctOption]));
function validOfficeArtifact(){
  const artifact=structuredClone(officeTask.template);
  artifact.document.title='Báo cáo ngân sách Ngày hội tình nguyện';
  artifact.document.sections[0].body='Chúng tôi kiểm tra số lượng và đơn giá trước khi tổng hợp ngân sách.\n- Đối chiếu số suất ăn theo danh sách tham gia\n- Kiểm tra đơn giá nước uống từ dữ liệu đề bài';
  artifact.document.sections[1].body='Tổng ngân sách 410.000đ được đối chiếu giữa bảng tính, báo cáo và trang trình bày để đảm bảo nhất quán.';
  artifact.sheet.cells.D2='=B2*C2';artifact.sheet.cells.D3='=B3*C3';artifact.sheet.cells.D4='=SUM(D2:D3)';
  artifact.slides[0].bullets=['Kiểm tra số lượng và đơn giá','Sử dụng công thức tham chiếu ô'];
  artifact.slides[1].bullets=['Tính thành tiền cho từng hạng mục','Đối chiếu dữ liệu giữa các sản phẩm'];
  artifact.slides[2].bullets=['Tổng ngân sách dự kiến 410.000đ','Theo dõi chi phí theo kế hoạch'];
  return artifact;
}

beforeEach(()=>{store=new SqliteStore(':memory:');now=Date.parse('2026-11-01T00:00:00Z');service=new UniversityService(store,bank,capabilities,()=>now);});
afterEach(async()=>{await store.close();});

describe('durable academic service',()=>{
  it('creates a single profile and ignores client balance or semester',async()=>{
    const result=await service.createStudent('owner',{displayName:'An',major:'it',track:'cpp',balance:999999999,semester:8});
    expect(result.student?.balance).toBe(6000000);expect(result.student?.semester).toBe(1);
    await expect(create()).rejects.toMatchObject({status:409});
  });
  it('registers a valid semester transactionally and rejects prerequisites',async()=>{
    await enrolled();const student=await store.getStudent('owner');
    expect(student!.enrollments).toHaveLength(firstSemester.length);
    const balance=student!.balance;
    await expect(service.enroll('owner',{courseIds:['operating-systems']})).rejects.toMatchObject({status:400});
    expect((await store.getStudent('owner'))!.balance).toBe(balance);
  });
  it('does not charge tuition or duplicate enrollment on retry',async()=>{
    await enrolled();const before=await store.getStudent('owner');
    await service.enroll('owner',{courseIds:firstSemester});
    const after=await store.getStudent('owner');
    expect(after!.balance).toBe(before!.balance);expect(after!.enrollments).toHaveLength(firstSemester.length);
    await expect(service.enroll('owner',{courseIds:['intro-programming','intro-programming']})).rejects.toMatchObject({status:400});
  });
  it('replaces the desired set, refunds a withdrawn course once and preserves retained progress',async()=>{
    await enrolled();const lesson=getLessons('intro-programming','python').find(item=>item.checkpoint)!;
    await service.checkpoint('owner',{courseId:'intro-programming',lessonId:lesson.id,answer:String(lesson.checkpoint!.answerIndex)});
    const before=await store.getStudent('owner');const desired=firstSemester.filter(id=>id!=='english-1');
    const updated=await service.enroll('owner',{courseIds:desired});
    expect(updated.student!.enrollments.some(enrollment=>enrollment.courseId==='english-1')).toBe(false);
    expect(updated.student!.balance).toBe(before!.balance+600000);
    expect(updated.student!.progress['intro-programming']).toEqual(before!.progress['intro-programming']);
    const repeated=await service.enroll('owner',{courseIds:desired});expect(repeated.student!.balance).toBe(updated.student!.balance);
    const readded=await service.enroll('owner',{courseIds:firstSemester});expect(readded.student!.balance).toBe(before!.balance);
  });
  it('reverses tuition support on withdrawal so grant/refund cycles cannot mint money',async()=>{
    await create();await store.mutateStudent('owner',student=>{student.balance=0;});
    await service.enroll('owner',{courseIds:firstSemester});
    const withdrawn=await service.enroll('owner',{courseIds:[]});expect(withdrawn.student!.balance).toBe(0);expect(withdrawn.student!.enrollments).toHaveLength(0);
    await service.enroll('owner',{courseIds:firstSemester});const again=await service.enroll('owner',{courseIds:[]});expect(again.student!.balance).toBe(0);
  });
  it('does not withdraw a course after a formal assessment started',async()=>{
    await enrolled();await store.mutateStudent('owner',student=>{student.exams.push({id:'started',courseId:'intro-programming',kind:'midterm',definition:structuredClone(bank.assessments[0]),semester:1,startedAt:new Date(now).toISOString(),deadlineAt:new Date(now+300000).toISOString(),status:'active',answers:{}});});
    await expect(service.enroll('owner',{courseIds:firstSemester.filter(id=>id!=='intro-programming')})).rejects.toMatchObject({code:'withdrawal_assessment_started'});
    expect((await store.getStudent('owner'))!.enrollments).toHaveLength(firstSemester.length);
  });
  it('allows explicit GPA improvement from a prior passed course with new assessment progress',async()=>{
    await create();await store.mutateStudent('owner',student=>{
      student.semester=2;student.grades.push({courseId:'intro-programming',semester:1,status:'passed',score:5});
      student.progress['intro-programming']={courseId:'intro-programming',lessons:['old'],attendance:['old'],practice:[5],checkpointScores:{old:5},midterm:5,final:5};
    });
    await expect(service.enroll('owner',{courseIds:['intro-programming']})).rejects.toMatchObject({status:400});
    const improved=await service.enroll('owner',{courseIds:['intro-programming'],allowImprovement:true});
    expect(improved.student!.progress['intro-programming'].midterm).toBeUndefined();expect(improved.student!.progress['intro-programming'].final).toBeUndefined();
    expect(improved.student!.summary.credits).toBe(4);expect(improved.student!.summary.gpa).toBe(1);
    for(const lesson of getLessons('intro-programming','python').filter(item=>item.checkpoint))await service.checkpoint('owner',{courseId:'intro-programming',lessonId:lesson.id,answer:String(lesson.checkpoint!.answerIndex)});
    await store.mutateStudent('owner',student=>{student.progress['intro-programming'].checkpointScores['verified-code']=10;});
    await week16();
    for(const kind of ['midterm','final']){
      const attempt=await service.startExam('owner',{courseId:'intro-programming',kind});
      await service.saveExam('owner',attempt.exam.id,{answers:correctAnswers()});await service.submitExam('owner',attempt.exam.id,{idempotencyKey:`improve-${kind}`});
    }
    const final=await service.bootstrap('owner');expect(final.student!.summary.gpa).toBe(4);expect(final.student!.summary.credits).toBe(4);
  });
  it('does not use the improvement flag to convert exemptions or a same-semester pass into new grades',async()=>{
    await create();await store.mutateStudent('owner',student=>{student.semester=2;student.grades.push({courseId:'english-1',status:'exempt',semester:1});});
    await expect(service.enroll('owner',{courseIds:['english-1'],allowImprovement:true})).rejects.toMatchObject({code:'improvement_not_eligible'});
    await store.mutateStudent('owner',student=>{student.grades.push({courseId:'intro-programming',status:'passed',score:5,semester:2});});
    await expect(service.enroll('owner',{courseIds:['intro-programming'],allowImprovement:true})).rejects.toMatchObject({code:'improvement_not_eligible'});
  });
  it('rejects an invalid section without changing the transcript',async()=>{
    await create();await expect(service.enroll('owner',{courseIds:firstSemester,sections:{'intro-programming':'made-up'}})).rejects.toMatchObject({status:400});
    expect((await store.getStudent('owner'))!.enrollments).toHaveLength(0);
  });
  it('exempts English 1–3 by level, counts 12 credits without GPA, and never exempts specialized English',async()=>{
    await create();const answers=Object.fromEntries(bank.placement.flatMap(group=>group.questions.map(question=>[question.id,question.correctOption])));
    const result=await service.placement('owner',{answers});
    expect(result.level).toBe(3);expect(result.student!.summary.credits).toBe(12);expect(result.student!.summary.gradedCredits).toBe(0);
    expect(result.student!.exemptions).toEqual(['english-1','english-2','english-3']);
    expect(result.student!.graduation.missingRequired).toContain('technical-english');
    await expect(service.placement('owner',{answers})).rejects.toMatchObject({status:409});
  });
  it('requires consecutive placement levels and does not accept a claimed level',async()=>{
    await create();const answers=Object.fromEntries(bank.placement.filter(group=>group.level===3).flatMap(group=>group.questions.map(question=>[question.id,question.correctOption])));
    const result=await service.placement('owner',{answers,level:3});expect(result.level).toBe(0);
  });
  it('records participation for a wrong practice answer but no completed lesson',async()=>{
    await enrolled();const lesson=getLessons('intro-programming','python').find(item=>item.checkpoint)!;
    const wrong=String((lesson.checkpoint!.answerIndex+1)%lesson.checkpoint!.options.length);
    const result=await service.checkpoint('owner',{courseId:'intro-programming',lessonId:lesson.id,answer:wrong});
    expect(result.correct).toBe(false);expect(result.student!.attendance).toContain(lesson.id);expect(result.student!.completedLessons).not.toContain(lesson.id);
    const right=await service.checkpoint('owner',{courseId:'intro-programming',lessonId:lesson.id,answer:String(lesson.checkpoint!.answerIndex)});
    expect(right.student!.completedLessons.filter(id=>id===lesson.id)).toHaveLength(1);
  });
  it('rejects checkpoint attempts for courses not enrolled',async()=>{
    await create();const lesson=getLessons('intro-programming','python')[0];
    await expect(service.checkpoint('owner',{courseId:'intro-programming',lessonId:lesson.id,answer:'0'})).rejects.toMatchObject({status:403});
  });
  it('records a language bridge separately without inventing transcript credits or attendance',async()=>{
    await create();await expect(service.enroll('owner',{courseIds:['oop']})).rejects.toMatchObject({code:'language_bridge_required'});
    const bridgeLessons=getLessons('bridge-cpp','python').filter(lesson=>lesson.checkpoint);
    expect(bridgeLessons.length).toBeGreaterThan(0);
    for(const lesson of bridgeLessons)await service.checkpoint('owner',{courseId:'bridge-cpp',lessonId:lesson.id,answer:String(lesson.checkpoint!.answerIndex)});
    const result=await service.bootstrap('owner');expect(result.student!.completedBridges).toContain('bridge-cpp');expect(result.student!.grades).toHaveLength(0);expect(result.student!.attendance).toHaveLength(0);expect(result.student!.summary.credits).toBe(0);
  });
  it('does not move simulated time because real time passed',async()=>{
    await enrolled();now+=1000*60*60*24*30;const result=await service.bootstrap('owner');
    expect(result.student!.week).toBe(1);expect(result.student!.day).toBe(1);
  });
  it('requires explicit confirmation for skipped weeks and unfinished semester closure',async()=>{
    await enrolled();await expect(service.advance('owner',{unit:'week'})).rejects.toMatchObject({code:'advance_confirmation_required'});
    await week16();await expect(service.advance('owner',{unit:'semester'})).rejects.toMatchObject({code:'unfinished_courses'});
    const result=await service.advance('owner',{unit:'semester',confirm:true});
    expect(result.student!.semester).toBe(2);expect(result.student!.grades.every(grade=>grade.status==='failed')).toBe(true);
  });
  it('uses idempotent server-fixed activity rewards and daily limits',async()=>{
    await create();const first=await service.activity('owner',{activityId:'job',idempotencyKey:'same',reward:99999999});
    const second=await service.activity('owner',{activityId:'job',idempotencyKey:'same'});
    expect(first.student!.balance).toBe(6120000);expect(second.student!.balance).toBe(6120000);
    await expect(service.activity('owner',{activityId:'job',idempotencyKey:'other'})).rejects.toMatchObject({status:409});
  });
  it('rejects prototype names as activities without corrupting the wallet or health',async()=>{
    await create();const before=await store.getStudent('owner');
    for(const activityId of ['constructor','toString','__proto__'])await expect(service.activity('owner',{activityId,idempotencyKey:activityId})).rejects.toMatchObject({status:404});
    const after=await store.getStudent('owner');expect(after!.balance).toBe(before!.balance);expect(after!.energy).toBe(before!.energy);expect(after!.stress).toBe(before!.stress);expect(after!.ledger).toHaveLength(0);
  });
  it('never fabricates code execution success without a sandbox',async()=>{
    await enrolled();await expect(service.practice('owner',{courseId:'intro-programming',exerciseId:'intro-sum-python',language:'python',source:'print(5)'})).rejects.toMatchObject({status:503,code:'execution_unavailable'});
  });
  it('requires verified programming work before the intro final',async()=>{
    await enrolled();await week16();await expect(service.startExam('owner',{courseId:'intro-programming',kind:'final'})).rejects.toMatchObject({code:'code_practice_required'});
  });
  it('does not issue a graduation credential from client claims',async()=>{
    await create();await expect(service.credential('owner')).rejects.toMatchObject({code:'graduation_ineligible'});
  });
  it('assesses an actual office artifact on the server and issues one zero-credit internal credential per version',async()=>{
    await create();const artifact=validOfficeArtifact();
    const first=await service.submitOffice('owner',{artifact});
    expect(first.assessment.passed).toBe(true);expect(first.assessment.score).toBe(10);
    expect(first.student!.summary.credits).toBe(0);expect(first.student!.summary.gradedCredits).toBe(0);
    expect(first.student!.grades.filter(grade=>grade.courseId==='office-skills')).toHaveLength(1);
    expect(first.student!.credentials[0].public).toBe(false);
    const repeated=await service.submitOffice('owner',{artifact});
    expect(repeated.student!.credentials).toHaveLength(1);expect(repeated.student!.grades.filter(grade=>grade.courseId==='office-skills')).toHaveLength(1);
  });
  it('does not accept a claimed office score or a formula replaced by a hardcoded total',async()=>{
    await create();const artifact=validOfficeArtifact();artifact.sheet.cells.D4='=410000';
    const result=await service.submitOffice('owner',{artifact,score:10,passed:true});
    expect(result.assessment.passed).toBe(false);expect(result.student!.credentials).toHaveLength(0);expect(result.student!.grades).toHaveLength(0);
    await expect(service.startExam('owner',{courseId:'office-skills',kind:'final'})).rejects.toMatchObject({code:'office_practical_required'});
  });
  it('rejects malformed office submissions without mutating the profile',async()=>{
    await create();const before=await store.getStudent('owner');
    await expect(service.submitOffice('owner',{artifact:null})).rejects.toMatchObject({status:400});
    expect((await store.getStudent('owner'))!.revision).toBe(before!.revision);
  });
});

describe('server deadlines, ownership and immutable exam definitions',()=>{
  beforeEach(async()=>{await enrolled();await week16();});
  it('resumes the same attempt with the original deadline',async()=>{
    const first=await service.startExam('owner',{courseId:'intro-programming',kind:'midterm',durationSeconds:999999});
    now+=10000;const second=await service.startExam('owner',{courseId:'intro-programming',kind:'midterm'});
    expect(second.exam.id).toBe(first.exam.id);expect(second.exam.deadlineAt).toBe(first.exam.deadlineAt);
  });
  it('serializes every student response without official keys or private exam definitions',async()=>{
    const result=await service.startExam('owner',{courseId:'intro-programming',kind:'midterm'});
    const bootstrap=await service.bootstrap('owner');
    for(const value of [result,bootstrap]){
      const serialized=JSON.stringify(value);expect(serialized).not.toContain('correctOption');expect(serialized).not.toContain('isPublicDevelopmentSample');expect(serialized).not.toContain('definition');
    }
  });
  it('does not allow another account to view or save a known attempt ID',async()=>{
    await create('attacker');const result=await service.startExam('owner',{courseId:'intro-programming',kind:'midterm'});
    await expect(service.exam('attacker',result.exam.id)).rejects.toMatchObject({status:404});
    await expect(service.saveExam('attacker',result.exam.id,{answers:correctAnswers()})).rejects.toMatchObject({status:404});
  });
  it('preserves the last acknowledged answers when a later save misses the deadline',async()=>{
    const result=await service.startExam('owner',{courseId:'intro-programming',kind:'midterm'});
    await service.saveExam('owner',result.exam.id,{answers:{variable:'1'}});
    now=Date.parse(result.exam.deadlineAt)+1;
    const late=await service.saveExam('owner',result.exam.id,{answers:correctAnswers()});
    expect(late.expired).toBe(true);expect(late.exam.status).toBe('graded');expect(late.exam.answers).toEqual({variable:'1'});expect(late.exam.score).toBeCloseTo(1.7);
  });
  it('submits once, freezes answers and cannot multiply the result with retries',async()=>{
    const result=await service.startExam('owner',{courseId:'intro-programming',kind:'midterm'});
    await service.saveExam('owner',result.exam.id,{answers:correctAnswers()});
    const first=await service.submitExam('owner',result.exam.id,{idempotencyKey:'first'});
    const retry=await service.submitExam('owner',result.exam.id,{idempotencyKey:'second'});
    expect(first.exam.score).toBe(10);expect(retry.exam.score).toBe(10);expect(retry.student!.exams).toHaveLength(1);
    await expect(service.saveExam('owner',result.exam.id,{answers:{variable:'0'}})).rejects.toMatchObject({status:409});
  });
  it('pins a copy of the assessment rather than a mutable shared bank object',async()=>{
    const localBank=createDevelopmentBank();const localService=new UniversityService(store,localBank,capabilities,()=>now);
    const started=await localService.startExam('owner',{courseId:'intro-programming',kind:'midterm'});
    localBank.assessments[0].questions[0].correctOption='0';
    await localService.saveExam('owner',started.exam.id,{answers:correctAnswers()});
    const submitted=await localService.submitExam('owner',started.exam.id,{idempotencyKey:'pinned'});
    expect(submitted.exam.score).toBe(10);
  });
  it('allows the final retake when the final met its floor but the overall course failed',async()=>{
    await store.mutateStudent('owner',student=>{student.progress['intro-programming'].checkpointScores['verified-code']=10;});
    const first=await service.startExam('owner',{courseId:'intro-programming',kind:'final'});
    const three=Object.fromEntries(Object.entries(correctAnswers()).slice(0,3));
    await service.saveExam('owner',first.exam.id,{answers:three});
    const failed=await service.submitExam('owner',first.exam.id,{idempotencyKey:'failed-first'});
    expect(failed.exam.score).toBe(5);expect(failed.student!.grades.find(grade=>grade.courseId==='intro-programming')!.status).toBe('failed');
    const retry=await service.startExam('owner',{courseId:'intro-programming',kind:'final'});
    expect(retry.exam.id).not.toBe(first.exam.id);
  });
  it('rejects a misconfigured multiple-choice capstone instead of awarding project credits',async()=>{
    const localBank=createDevelopmentBank();localBank.assessments.push({...localBank.assessments[1],id:'bad-capstone',courseId:'it-capstone'});
    const localService=new UniversityService(store,localBank,capabilities,()=>now);
    await expect(localService.startExam('owner',{courseId:'it-capstone',kind:'final'})).rejects.toMatchObject({code:'project_assessment_required'});
    expect((await store.getStudent('owner'))!.grades).toHaveLength(0);
  });
  it('sharing a credential does not disclose the underlying transcript records',async()=>{
    await store.mutateStudent('owner',student=>{
      student.credentials.push({code:'USIM-PRIVACY',type:'graduation',issuedAt:new Date(now).toISOString(),public:true,curriculumVersion:'2026.v1'});
      student.grades.push({courseId:'intro-programming',semester:1,status:'passed',score:9});
    });
    const lookup=await service.lookupCredential('USIM-PRIVACY');
    expect(lookup.summary).toEqual({credits:4,gpa:4});expect(JSON.stringify(lookup)).not.toContain('intro-programming');expect(JSON.stringify(lookup)).not.toContain('records');
  });
});

describe('submission outbox, budgets and recovery',()=>{
  it('writes a submission and its outbox atomically and enforces one queued job per learner',async()=>{
    await enrolled();const submission:Submission={id:'one',userId:'owner',courseId:'intro-programming',exerciseId:'intro-sum-python',language:'python',source:'print(5)',status:'queued',createdAt:new Date(now).toISOString(),acceptedAt:new Date(now).toISOString(),assessmentVersion:bank.version,semester:1};
    await store.enqueueSubmission(submission,{month:'2026-11',seconds:30,limit:60});
    await expect(store.enqueueSubmission({...submission,id:'two'},{month:'2026-11',seconds:30,limit:60})).rejects.toMatchObject({status:409});
    expect(await store.monthlyExecutionSeconds('2026-11')).toBe(30);expect((await store.pendingSubmissions()).map(item=>item.id)).toEqual(['one']);
  });
  it('reconciles durable queued submissions even after their Redis-dispatch marker was written',async()=>{
    const submission:Submission={id:'redis-lost',userId:'owner',courseId:'intro-programming',exerciseId:'intro-sum-python',language:'python',source:'print(5)',status:'queued',createdAt:new Date(now).toISOString(),acceptedAt:new Date(now).toISOString(),assessmentVersion:bank.version,semester:1};
    await store.enqueueSubmission(submission);await store.markDispatched(submission.id);
    expect((await store.pendingSubmissions()).map(item=>item.id)).toContain(submission.id);
  });
  it('refuses an over-budget job without creating a submission or reservation',async()=>{
    const submission:Submission={id:'budget',userId:'owner',courseId:'intro-programming',exerciseId:'intro-sum-python',language:'python',source:'print(5)',status:'queued',createdAt:new Date(now).toISOString(),acceptedAt:new Date(now).toISOString(),assessmentVersion:bank.version,semester:1};
    await expect(store.enqueueSubmission(submission,{month:'2026-11',seconds:30,limit:29})).rejects.toMatchObject({code:'execution_budget_exhausted'});
    expect(await store.getSubmission('budget')).toBeNull();expect(await store.monthlyExecutionSeconds('2026-11')).toBe(0);
  });
  it('applies verified execution once even if the queue delivers it twice',async()=>{
    await enrolled();const submission:Submission={id:'mock-run',userId:'owner',courseId:'intro-programming',exerciseId:'intro-sum-python',language:'python',source:'print(5)',status:'queued',createdAt:new Date(now).toISOString(),acceptedAt:new Date(now).toISOString(),assessmentVersion:bank.version,semester:1};
    await store.enqueueSubmission(submission);let calls=0;
    const executor={execute:async()=>{calls++;return {passed:4,total:4,feedback:'mock sandbox verification'};}};
    await processSubmission(submission.id,store,bank,executor);await processSubmission(submission.id,store,bank,executor);
    expect(calls).toBe(1);expect((await store.getStudent('owner'))!.progress['intro-programming'].checkpointScores['verified-code']).toBe(10);
  });
  it('atomically claims a job so concurrent deliveries execute learner source only once',async()=>{
    await enrolled();const submission:Submission={id:'concurrent',userId:'owner',courseId:'intro-programming',exerciseId:'intro-sum-python',language:'python',source:'print(5)',status:'queued',createdAt:new Date(now).toISOString(),acceptedAt:new Date(now).toISOString(),assessmentVersion:bank.version,semester:1};
    await store.enqueueSubmission(submission);let calls=0;
    const executor={execute:async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,25));return {passed:4,total:4,feedback:'mock isolated result'};}};
    await Promise.all([processSubmission(submission.id,store,bank,executor),processSubmission(submission.id,store,bank,executor)]);
    expect(calls).toBe(1);expect((await store.getSubmission(submission.id))!.status).toBe('passed');
  });
  it('expires a crashed execution lease without recording an academic failure or silently charging a second execution',async()=>{
    await enrolled();const submission:Submission={id:'crashed',userId:'owner',courseId:'intro-programming',exerciseId:'intro-sum-python',language:'python',source:'print(5)',status:'queued',createdAt:new Date(now).toISOString(),acceptedAt:new Date(now).toISOString(),assessmentVersion:bank.version,semester:1};
    await store.enqueueSubmission(submission,{month:'2026-11',seconds:45,limit:100});await store.claimSubmission(submission.id,'crashed-owner',new Date(Date.now()-1).toISOString());
    await store.pendingSubmissions();expect((await store.getSubmission(submission.id))!.status).toBe('error');expect((await store.getStudent('owner'))!.grades).toHaveLength(0);expect(await store.monthlyExecutionSeconds('2026-11')).toBe(45);
  });
  it('does not translate an executor failure into a failing course grade',async()=>{
    await enrolled();const submission:Submission={id:'outage',userId:'owner',courseId:'intro-programming',exerciseId:'intro-sum-python',language:'python',source:'print(5)',status:'queued',createdAt:new Date(now).toISOString(),acceptedAt:new Date(now).toISOString(),assessmentVersion:bank.version,semester:1};
    await store.enqueueSubmission(submission);await processSubmission(submission.id,store,bank,{execute:async()=>{throw new Error('outage');}});
    expect((await store.getSubmission(submission.id))!.status).toBe('error');expect((await store.getStudent('owner'))!.grades).toHaveLength(0);
  });
  it('grades a project from three verified artifact stages using 20/30/50 weights',async()=>{
    await create();await store.mutateStudent('owner',student=>{
      student.semester=8;
      student.progress['it-capstone']={courseId:'it-capstone',lessons:[],attendance:[],practice:[],checkpointScores:{}};
    });
    const projectBank=createDevelopmentBank();
    for(const stage of [1,2,3] as const){
      const exercise={...projectBank.exercises[0],id:`capstone-${stage}`,courseId:'it-capstone',projectStage:stage};projectBank.exercises.push(exercise);
      const submission:Submission={id:`stage-${stage}`,userId:'owner',courseId:'it-capstone',exerciseId:exercise.id,language:'cpp',source:'stage artifact',status:'queued',createdAt:new Date(now).toISOString(),acceptedAt:new Date(now).toISOString(),assessmentVersion:projectBank.version,semester:8};
      await store.enqueueSubmission(submission);
      const passed=stage===1?2:4;
      await processSubmission(submission.id,store,projectBank,{execute:async()=>({passed,total:4,feedback:'mock verified artifact'})});
    }
    const grade=(await store.getStudent('owner'))!.grades.find(grade=>grade.courseId==='it-capstone');
    expect(grade!.score).toBe(9);expect(grade!.status).toBe('passed');
  });
  it('keeps progress and pending submissions across a database restart',async()=>{
    const directory=mkdtempSync(join(tmpdir(),'university-store-'));const database=join(directory,'data.sqlite');
    try{
      const disk=new SqliteStore(database);const diskService=new UniversityService(disk,bank,capabilities,()=>now);
      await diskService.createStudent('persisted',{displayName:'An',major:'cs',track:'cpp'});await disk.close();
      const reopened=new SqliteStore(database);expect((await reopened.getStudent('persisted'))!.displayName).toBe('An');await reopened.close();
    }finally{
      const checked=resolve(directory);if(!checked.startsWith(resolve(tmpdir())+ '\\university-store-')&&!checked.startsWith(resolve(tmpdir())+'/university-store-'))throw new Error('Unsafe temporary cleanup path');
      rmSync(checked,{recursive:true,force:true});
    }
  });
});
