import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createDevelopmentBank,loadAssessmentBank} from '../src/bank.js';

let directory:string;let path:string;
beforeEach(()=>{directory=mkdtempSync(join(tmpdir(),'university-bank-'));path=join(directory,'sample.json');vi.stubEnv('NODE_ENV','development');vi.stubEnv('ASSESSMENT_BANK_PATH',path);});
afterEach(()=>{vi.unstubAllEnvs();const checked=resolve(directory);if(!checked.startsWith(resolve(tmpdir())+'\\university-bank-')&&!checked.startsWith(resolve(tmpdir())+'/university-bank-'))throw new Error('Unsafe fixture cleanup path');rmSync(checked,{recursive:true,force:true});});
function load(bank:ReturnType<typeof createDevelopmentBank>){writeFileSync(path,JSON.stringify(bank));return loadAssessmentBank();}
describe('assessment bank executable-question validation',()=>{
  it('loads a structurally valid one-code-question development sample',()=>{expect(load(createDevelopmentBank())!.assessments.find(exam=>exam.kind==='final')!.questions.filter(question=>question.kind==='code')).toHaveLength(1);});
  it('refuses unsupported multiple code questions instead of dropping ungraded work',()=>{
    const bank=createDevelopmentBank();const final=bank.assessments.find(exam=>exam.kind==='final')!;final.questions.push({...final.questions.find(question=>question.kind==='code')!,id:'second-code'});
    expect(()=>load(bank)).toThrow('at most one code question');
  });
  it('refuses a mismatched entry-track execution mapping',()=>{
    const bank=createDevelopmentBank();bank.assessments.find(exam=>exam.kind==='final')!.questions.find(question=>question.kind==='code')!.exerciseIds={cpp:'intro-sum-python',python:'intro-sum-python'};
    expect(()=>load(bank)).toThrow('track mapping');
  });
  it('rejects invalid weights and out-of-range essential code criteria',()=>{
    const bank=createDevelopmentBank();bank.assessments.find(exam=>exam.kind==='final')!.questions.find(question=>question.kind==='code')!.requiredPassRatio=1.1;
    expect(()=>load(bank)).toThrow('pass ratio');
    const weight=createDevelopmentBank();weight.assessments[0].questions[0].weight=-1;expect(()=>load(weight)).toThrow('weight');
  });
});
