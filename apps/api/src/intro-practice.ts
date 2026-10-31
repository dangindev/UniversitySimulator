import {introPracticeRequirements,introProject} from '@university-simulator/content';
import type {StudentDocument} from './types.js';

export interface IntroPracticeAssessment {
  score:number;completed:number;required:number;verifiedExerciseIds:string[];finalRequiredIds:string[];missingFinalExerciseIds:string[];projectScore:number;
}
export function introPracticeScores(student:StudentDocument){
  const requirements=introPracticeRequirements(student.track);
  const scores=student.progress['intro-programming']?.checkpointScores??{};
  const score=(id:string)=>{const value=scores[`code:${id}`];return typeof value==='number'&&Number.isFinite(value)?Math.min(10,Math.max(0,value)):0;};
  return {requirements,score,values:requirements.requiredIds.map(score)};
}
export function assessIntroPractice(student:StudentDocument):IntroPracticeAssessment{
  const {requirements,score,values}=introPracticeScores(student);
  const verifiedExerciseIds=requirements.requiredIds.filter(id=>score(id)===10);
  const projectScore=requirements.capstoneIds.reduce((sum,id,index)=>sum+score(id)*(introProject.milestones[index]?.weight??0)/100,0);
  return {score:values.length?Math.round(values.reduce((sum,value)=>sum+value,0)/values.length*100)/100:0,completed:verifiedExerciseIds.length,required:values.length,verifiedExerciseIds,finalRequiredIds:[...requirements.finalRequiredIds],missingFinalExerciseIds:requirements.finalRequiredIds.filter(id=>score(id)<10),projectScore:Math.round(projectScore*100)/100};
}
