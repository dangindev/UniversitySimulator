import {beforeAll,describe,expect,it} from 'vitest';
import {DockerExecutionAdapter,runDockerCommand} from '../src/docker-execution.js';
import {randomUUID} from 'node:crypto';
import type {PrivateExercise,Submission} from '../src/types.js';
import {SqliteStore} from '../src/store.js';
import {UniversityService,type Capabilities} from '../src/service.js';
import {createDevelopmentBank} from '../src/bank.js';
import {createLocalExecutionControl,localGradingPreflight,startLocalGrader} from '../src/local-grader.js';
import {programs} from '@university-simulator/core';
import {getPracticeReference,introPracticeRequirements} from '@university-simulator/content';

const adapter=new DockerExecutionAdapter();
function task(language:Submission['language'],source:string,input='2 3\n',expected='5\n'){
  const id=`docker-${randomUUID()}`;
  const submission:Submission={id,userId:'integration',courseId:'intro-programming',exerciseId:id,language,source,status:'queued',createdAt:new Date().toISOString(),acceptedAt:new Date().toISOString(),assessmentVersion:'integration.1',semester:1};
  const exercise:PrivateExercise={id,courseId:'intro-programming',title:'Isolated verification',prompt:'Internal test',language,tests:[{input,expected,public:true}],timeoutSeconds:15,templateId:''};
  return {submission,exercise};
}
const enabled=process.env.USIM_DOCKER_INTEGRATION==='1';
describe.runIf(enabled)('real local Docker execution (no host learner execution)',()=>{
  beforeAll(async()=>{expect((await adapter.probe(true)).available,'Build infra/local/Dockerfile and start a Linux Docker engine first.').toBe(true);},30000);
  it.each([
    ['python','a,b=map(int,input().split())\nprint(a+b)'],
    ['cpp','#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}'],
    ['javascript',"const fs=require('fs');const[a,b]=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);console.log(a+b);"],
  ] as const)('runs a correct %s program and removes its container',async(language,source)=>{
    const {submission,exercise}=task(language,source);const graded=await adapter.execute(submission,exercise);expect(graded.passed).toBe(1);
    const remaining=await runDockerCommand(['ps','--all','--filter',`label=usim.job=${submission.id}`,'--format','{{.ID}}'],undefined,5000);expect(remaining.stdout.trim()).toBe('');
  },60000);
  it('runs SQLite in an isolated in-memory database',async()=>{
    const {submission,exercise}=task('sql','SELECT name FROM students ORDER BY name;',"CREATE TABLE students(name TEXT); INSERT INTO students VALUES('Linh');",'[["Linh"]]');expect((await adapter.execute(submission,exercise)).passed).toBe(1);
  },60000);
  it('rejects wrong output, compile errors and runtime errors as learner failures',async()=>{
    const wrong=task('python','print(0)');expect((await adapter.execute(wrong.submission,wrong.exercise)).tests![0].status).toBe('wrong-answer');
    const compile=task('cpp','int main( {');expect((await adapter.execute(compile.submission,compile.exercise)).compileErrors?.length).toBeGreaterThan(0);
    const runtime=task('python',"raise RuntimeError('student error')");expect((await adapter.execute(runtime.submission,runtime.exercise)).tests![0].status).toBe('runtime-error');
  },60000);
  it('enforces CPU/wall time and output limits',async()=>{
    const infinite=task('python','while True: pass');expect((await adapter.execute(infinite.submission,infinite.exercise)).tests![0].status).toBe('time-limit');
    const flood=task('python',"while True: print('x'*1024)");expect((await adapter.execute(flood.submission,flood.exercise)).tests![0].status).toBe('output-limit');
  },60000);
  it('has no outbound network, no host Docker socket, no writable root and no effective capabilities',async()=>{
    const source="import os,socket\ntry:\n socket.create_connection(('1.1.1.1',53),timeout=.2); print('OPEN')\nexcept OSError: print('BLOCKED')\ntry:\n open('/etc/usim-test','w').write('x'); print('WRITABLE')\nexcept OSError: print('READONLY')\nprint(os.getuid())\nprint(os.path.exists('/var/run/docker.sock'))\nfor line in open('/proc/self/status'):\n if line.startswith('CapEff:'): print(line.split()[1])\n if line.startswith('NoNewPrivs:'): print(line.split()[1])\n";
    const t=task('python',source,'','BLOCKED\nREADONLY\n65532\nFalse\n0000000000000000\n1\n');expect((await adapter.execute(t.submission,t.exercise)).passed).toBe(1);
  },60000);
  it('enforces memory/pid bounds and never leaks private expected output',async()=>{
    const resource=task('python',"import resource\nprint(resource.getrlimit(resource.RLIMIT_NPROC)[0])\nprint(resource.getrlimit(resource.RLIMIT_AS)[0])",'','32\n268435456\n');expect((await adapter.execute(resource.submission,resource.exercise)).passed).toBe(1);
    const privateCase=task('python','print(0)','','PRIVATE_ORACLE_NEVER_SENT');privateCase.exercise.tests[0]!.public=false;
    const result=await adapter.execute(privateCase.submission,privateCase.exercise);expect(JSON.stringify(result)).not.toContain('PRIVATE_ORACLE_NEVER_SENT');expect(result.tests![0]).not.toHaveProperty('expected');
  },60000);
  it('consumes real persisted SQLite submissions through the no-Redis local worker',async()=>{
    const store=new SqliteStore(':memory:');const bank=createDevelopmentBank();const control=createLocalExecutionControl(store);
    const caps:Capabilities={developmentAuth:true,assessmentMode:'development-samples',codeExecution:true,executionProvider:'docker-local',productionReady:false,curriculumVersion:'2026.v1',contentStatus:'draft'};
    const service=new UniversityService(store,bank,caps,Date.now,()=>localGradingPreflight(adapter,control));
    const grader=startLocalGrader(store,bank,adapter,control,()=>undefined);
    try{
      await service.createStudent('integration',{displayName:'Docker integration',major:'it',track:'python'});await service.enroll('integration',{courseIds:programs[0].recommendedPath[0]});
      const exerciseId=introPracticeRequirements('python').requiredIds[0]!;const reference=getPracticeReference(exerciseId)!;
      const queued=await service.practice('integration',{courseId:'intro-programming',exerciseId,language:'python',source:reference.source});
      const deadline=Date.now()+60000;let completed=await store.getSubmission(queued.submission.id);
      while(completed?.status==='queued'||completed?.status==='running'){
        if(Date.now()>deadline)throw new Error('Local queue timed out');await new Promise(resolve=>setTimeout(resolve,150));completed=await store.getSubmission(queued.submission.id);
      }
      expect(completed!.status).toBe('passed');const state=await service.bootstrap('integration');const practice=state.student!.progress['intro-programming'].practiceAssessment;
      expect(practice.completed).toBe(1);expect(practice.required).toBe(38);expect(practice.score).toBeLessThan(1);
    }finally{await grader.close();await store.close();}
  },90000);
});
