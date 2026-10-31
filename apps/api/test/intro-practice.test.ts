import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {getLessons,introPracticeRequirements} from '@university-simulator/content';
import {programs} from '@university-simulator/core';
import {SqliteStore} from '../src/store.js';
import {UniversityService,type Capabilities} from '../src/service.js';
import {createDevelopmentBank} from '../src/bank.js';
import {assessIntroPractice} from '../src/intro-practice.js';
import {recordCourseGrade} from '../src/assessment.js';
import {processSubmission} from '../src/queue.js';
import type {Submission} from '../src/types.js';
import {randomUUID} from 'node:crypto';

const caps:Capabilities={developmentAuth:true,assessmentMode:'development-samples',codeExecution:true,productionReady:false,curriculumVersion:'2026.v1',contentStatus:'draft'};
let store:SqliteStore;let service:UniversityService;const bank=createDevelopmentBank();
beforeEach(async()=>{store=new SqliteStore(':memory:');service=new UniversityService(store,bank,caps);await service.createStudent('owner',{displayName:'Practice learner',major:'it',track:'python'});await service.enroll('owner',{courseIds:programs[0].recommendedPath[0]});});
afterEach(async()=>store.close());
async function grade(exerciseId:string,fraction:number){
  const exercise=bank.exercises.find(exercise=>exercise.id===exerciseId)!;const id=randomUUID();const now=new Date().toISOString();
  const submission:Submission={id,userId:'owner',courseId:'intro-programming',exerciseId,language:'python',source:'unit executor fixture',status:'queued',createdAt:now,acceptedAt:now,assessmentVersion:bank.version,semester:1};
  await store.enqueueSubmission(submission);await processSubmission(id,store,bank,{execute:async()=>({passed:Math.round(fraction*exercise.tests.length),total:exercise.tests.length,feedback:'Unit executor result'})});
}
describe('intro practice evidence and denominator',()=>{
  it('keeps all 38 missing tasks at zero despite every public checkpoint being correct',async()=>{
    for(const lesson of getLessons('intro-programming','python').filter(lesson=>lesson.checkpoint))await service.checkpoint('owner',{courseId:'intro-programming',lessonId:lesson.id,answer:String(lesson.checkpoint!.answerIndex)});
    const state=await service.bootstrap('owner');const assessment=state.student!.progress['intro-programming'].practiceAssessment;
    expect(assessment.required).toBe(38);expect(assessment.completed).toBe(0);expect(assessment.score).toBe(0);expect(assessment.missingFinalExerciseIds).toHaveLength(21);
  });
  it('does not turn the legacy toy verification flag into a course practice grade',async()=>{
    await store.mutateStudent('owner',student=>{student.progress['intro-programming'].checkpointScores['verified-code']=10;student.progress['intro-programming'].checkpointScores['code:intro-sum-python']=10;});
    expect(assessIntroPractice((await store.getStudent('owner'))!).score).toBe(0);
  });
  it('uses the best test fraction once per required exercise, without retry inflation or downgrade',async()=>{
    const id=introPracticeRequirements('python').requiredIds[0]!;
    await grade(id,1);await grade(id,0);await grade(id,1);
    const state=await service.bootstrap('owner');const assessment=state.student!.progress['intro-programming'].practiceAssessment;
    expect(assessment.completed).toBe(1);expect(assessment.required).toBe(38);expect(assessment.score).toBe(0.26);expect(state.student!.progress['intro-programming'].practice).toHaveLength(38);
  });
  it('publishes the 20/30/50 mini-project score without counting it twice in the overall practice average',async()=>{
    const requirements=introPracticeRequirements('python');await store.mutateStudent('owner',student=>{
      requirements.capstoneIds.forEach((id,index)=>{student.progress['intro-programming'].checkpointScores[`code:${id}`]=[5,8,10][index]!;});
    });
    const assessment=assessIntroPractice((await store.getStudent('owner'))!);expect(assessment.projectScore).toBe(8.4);expect(assessment.score).toBe(0.61);expect(assessment.required).toBe(38);
  });
  it('requires the early modules and all three real mini-project stages before the final timer starts',async()=>{
    await store.mutateStudent('owner',student=>{student.week=16;student.progress['intro-programming'].checkpointScores['verified-code']=10;});
    await expect(service.startExam('owner',{courseId:'intro-programming',kind:'final'})).rejects.toMatchObject({code:'code_practice_required'});
    expect((await store.getStudent('owner'))!.exams).toHaveLength(0);
  });
  it('recomputes an existing final course result when a recovered practice result is applied',async()=>{
    const requirements=introPracticeRequirements('python');const advanced=requirements.requiredIds.find(id=>!requirements.finalRequiredIds.includes(id))!;
    await store.mutateStudent('owner',student=>{
      const progress=student.progress['intro-programming'];requirements.finalRequiredIds.forEach(id=>{progress.checkpointScores[`code:${id}`]=10;});
      progress.attendance=getLessons('intro-programming','python').map(lesson=>lesson.id);progress.midterm=10;progress.final=10;progress.finalCodeCriterionPassed=true;recordCourseGrade(student,'intro-programming');
    });
    const before=(await store.getStudent('owner'))!.grades[0]!.score!;await grade(advanced,1);const after=(await store.getStudent('owner'))!.grades[0]!.score!;
    expect(after).toBeGreaterThan(before);expect((await store.getStudent('owner'))!.grades.filter(grade=>grade.courseId==='intro-programming')).toHaveLength(1);
  });
  it('does not expose sealed assessment exercise prompts or permit their use through the practice oracle',async()=>{
    const sealed=new Set(bank.assessments.flatMap(assessment=>assessment.questions.flatMap(question=>Object.values(question.exerciseIds??{}))));
    const state=await service.bootstrap('owner');expect(state.exercises.some(exercise=>sealed.has(exercise.id))).toBe(false);
    const exerciseId=[...sealed].find(id=>id.endsWith('python'))!;
    await expect(service.practice('owner',{courseId:'intro-programming',exerciseId,language:'python',source:'print(0)'})).rejects.toMatchObject({status:404});
  });
});
