import {calculateCourseGrade,getCourse} from '@university-simulator/core';
import {getLessons} from '@university-simulator/content';
import type {CourseProgress,ExamAttempt,StudentDocument,Submission} from './types.js';

export function progressFor(student:StudentDocument,courseId:string):CourseProgress{
  return student.progress[courseId]??={courseId,lessons:[],attendance:[],practice:[],checkpointScores:{}};
}
export function recordCourseGrade(student:StudentDocument,courseId:string){
  if(getCourse(courseId)?.kind==='project')return;
  const progress=progressFor(student,courseId);if(progress.final===undefined)return;
  const totalLessons=Math.max(1,getLessons(courseId,student.track).length);
  const grade=getCourse(courseId)?.kind==='requirement'?{score:progress.final,passed:progress.final>=5}:calculateCourseGrade({attendance:Math.min(10,progress.attendance.length/totalLessons*10),practice:progress.practice.length?progress.practice.reduce((a,b)=>a+b,0)/progress.practice.length:0,midterm:progress.midterm??0,final:progress.final});
  const passed=grade.passed&&progress.finalCodeCriterionPassed!==false;
  const record={courseId,semester:student.semester,status:passed?'passed' as const:'failed' as const,score:grade.score,reason:progress.finalCodeCriterionPassed===false?progress.codeCriterionReason:undefined};
  const existing=student.grades.find(item=>item.courseId===courseId&&item.semester===student.semester&&item.status!=='exempt');
  if(existing)Object.assign(existing,record);else student.grades.push(record);
}
export function calculateExamScore(exam:ExamAttempt,codeFraction?:number){
  let points=0,total=0;
  for(const question of exam.definition.questions){
    const weight=question.weight??1;total+=weight;
    if(question.kind==='code')points+=weight*Math.max(0,Math.min(1,codeFraction??0));
    else if(exam.answers[question.id]===question.correctOption)points+=weight;
  }
  return Math.round(points/total*100)/10;
}
export function applyGradedExam(student:StudentDocument,exam:ExamAttempt){
  if(exam.semester!==student.semester)throw new Error('Cannot apply a pending exam to a different semester.');
  recomputeExamComponents(student,exam.courseId);
}
export function recomputeExamComponents(student:StudentDocument,courseId:string){
  const progress=progressFor(student,courseId);
  const attempts=student.exams.filter(exam=>exam.courseId===courseId&&exam.semester===student.semester&&exam.status==='graded');
  const mids=attempts.filter(exam=>exam.kind==='midterm');progress.midterm=mids.length?Math.max(...mids.map(exam=>exam.score??0)):undefined;
  const finals=attempts.filter(exam=>exam.kind==='final');
  const eligible=finals.filter(exam=>!exam.definition.questions.some(question=>question.kind==='code')||exam.codeResult?.criterionPassed===true);
  const candidates=eligible.length?eligible:finals;
  progress.final=candidates.length?Math.max(...candidates.map(exam=>exam.score??0)):undefined;
  progress.finalCodeCriterionPassed=finals.length?eligible.length>0:undefined;
  progress.codeCriterionReason=finals.length&&!eligible.length?'Chưa đạt điều kiện kiểm thử bắt buộc của bài lập trình cuối kỳ.':undefined;
  if(progress.final===undefined)student.grades=student.grades.filter(grade=>!(grade.courseId===courseId&&grade.semester===student.semester&&grade.status!=='exempt'));
  else recordCourseGrade(student,courseId);
}
export function applyExamSubmission(student:StudentDocument,submission:Submission){
  const exam=student.exams.find(item=>item.id===submission.examId);
  if(!exam||exam.gradingSubmissionId!==submission.id||exam.status==='void'||exam.status==='graded')return;
  if(submission.status==='error'){
    exam.status='grading-error';exam.gradingError=submission.result?.feedback??'Dịch vụ chấm gặp sự cố; bài đã nhận vẫn được giữ.';return;
  }
  if(!['passed','failed'].includes(submission.status)||!submission.result)return;
  const result=submission.result;
  if(result.total<1)throw new Error('A graded code question requires at least one test.');
  const question=exam.definition.questions.find(question=>question.kind==='code')!;
  const requiredPassRatio=question.requiredPassRatio??0.5;
  exam.codeResult={passed:result.passed,total:result.total,feedback:result.feedback,requiredPassRatio,criterionPassed:result.passed/result.total>=requiredPassRatio};
  exam.score=calculateExamScore(exam,result.passed/result.total);
  exam.status='graded';exam.gradingError=undefined;exam.gradingDispatchPending=false;
  applyGradedExam(student,exam);
}
