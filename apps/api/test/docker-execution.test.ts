import {afterEach,describe,expect,it,vi} from 'vitest';
import {DockerExecutionAdapter,type DockerCommand,type CommandResult} from '../src/docker-execution.js';
import type {PrivateExercise,Submission} from '../src/types.js';

const imageId=`sha256:${'a'.repeat(64)}`;
const result=(stdout:string,extra:Partial<CommandResult>={}):CommandResult=>({code:0,stdout,stderr:'',timedOut:false,outputLimited:false,...extra});
const submission:Submission={id:'unit-docker-job',userId:'owner',courseId:'intro-programming',exerciseId:'example',language:'python',source:"print('$(should remain data)')",status:'queued',createdAt:'2026-11-01T00:00:00Z',acceptedAt:'2026-11-01T00:00:00Z',assessmentVersion:'fixture.1',semester:1};
const exercise:PrivateExercise={id:'example',courseId:'intro-programming',title:'Example',language:'python',prompt:'Print a value',timeoutSeconds:5,templateId:'',tests:[{input:'2 3\n',expected:'5\n',public:true},{input:'secret-case\n',expected:'PRIVATE_EXPECTED_VALUE'}]};
function fakeDocker(handler?:(args:string[],input?:string)=>CommandResult){
  const calls:{args:string[];input?:string}[]=[];
  const command:DockerCommand=async(args,input)=>{
    calls.push({args,input});
    if(args[0]==='version')return result('linux\n');
    if(args[0]==='image')return result(imageId+'\n');
    if(args[0]==='rm')return result('');
    if(args.at(-1)==='--probe')return result(JSON.stringify({protocol:1,uid:65532,runtimes:{cpp:'g++',python:'Python 3',javascript:'Node 24'}}));
    return handler?.(args,input)??result(JSON.stringify({protocol:1,status:'ok',output:Buffer.from('5\n').toString('base64'),diagnostic:''}));
  };
  return {command,calls};
}
afterEach(()=>vi.unstubAllEnvs());
describe('Docker control plane isolation',()=>{
  it('passes learner source only as stdin data into a restricted, digest-pinned container',async()=>{
    vi.stubEnv('NODE_ENV','development');const docker=fakeDocker();const adapter=new DockerExecutionAdapter('university-simulator-runner:local',docker.command);
    const graded=await adapter.execute(submission,exercise);expect(graded.passed).toBe(1);expect(graded.total).toBe(2);
    const runs=docker.calls.filter(call=>call.args[0]==='run'&&call.args.at(-1)!=='--probe');expect(runs).toHaveLength(2);
    for(const run of runs){
      const args=run.args;expect(args).toContain('--read-only');expect(args).toContain('--cap-drop');expect(args).toContain('ALL');expect(args).toContain('no-new-privileges:true');expect(args).toContain('65532:65532');expect(args).toContain('none');expect(args).toContain('512m');expect(args).toContain('--pids-limit');expect(args).toContain('--cpus');expect(args).toContain(imageId);
      expect(args).not.toContain('--privileged');expect(args).not.toContain('--volume');expect(args).not.toContain('--mount');expect(args.join(' ')).not.toContain(submission.source);
      expect(JSON.parse(run.input!).source).toBe(submission.source);expect(run.input).not.toContain('PRIVATE_EXPECTED_VALUE');
    }
    expect(graded.tests![1]).not.toHaveProperty('input');expect(graded.tests![1]).not.toHaveProperty('expected');expect(graded.tests![1]).not.toHaveProperty('actual');expect(graded.tests![1]).not.toHaveProperty('diagnostic');
    expect(docker.calls.filter(call=>call.args[0]==='rm')).toHaveLength(3);
  });
  it('returns an honest unavailable state without ever launching learner source when the engine is off',async()=>{
    const command=vi.fn<DockerCommand>(async()=>result('',{code:1,stderr:'engine unavailable'}));const adapter=new DockerExecutionAdapter(undefined,command);
    expect((await adapter.probe()).available).toBe(false);await expect(adapter.execute(submission,exercise)).rejects.toThrow('Docker Engine Linux');
    expect(command.mock.calls.every(([args])=>args[0]==='version')).toBe(true);
  });
  it('checks engine/image state without launching another probe container for an already verified digest',async()=>{
    const docker=fakeDocker();const adapter=new DockerExecutionAdapter(undefined,docker.command);
    await adapter.probe(true);await adapter.probe(true);await adapter.probe(true);
    expect(docker.calls.filter(call=>call.args[0]==='run'&&call.args.at(-1)==='--probe')).toHaveLength(1);
    expect(docker.calls.filter(call=>call.args[0]==='image')).toHaveLength(3);
  });
  it('kills and removes its own named container after a wall-time/output limit',async()=>{
    const docker=fakeDocker(()=>result('',{timedOut:true}));const adapter=new DockerExecutionAdapter(undefined,docker.command);
    const graded=await adapter.execute(submission,{...exercise,tests:[exercise.tests[0]!]});expect(graded.tests![0].status).toBe('time-limit');
    const run=docker.calls.find(call=>call.args[0]==='run'&&call.args.at(-1)!=='--probe')!;const name=run.args[run.args.indexOf('--name')+1];
    expect(docker.calls.some(call=>call.args.join(' ')===`rm --force ${name}`)).toBe(true);
  });
  it('does not accept forged grader JSON or an oversized output frame as a passing case',async()=>{
    const docker=fakeDocker(()=>result('{"passed":999,"total":999,"output":"NQ=="}'));const adapter=new DockerExecutionAdapter(undefined,docker.command);
    expect((await adapter.execute(submission,{...exercise,tests:[exercise.tests[0]!]})).passed).toBe(0);
    const huge=fakeDocker(()=>result('',{outputLimited:true}));expect((await new DockerExecutionAdapter(undefined,huge.command).execute(submission,{...exercise,tests:[exercise.tests[0]!]})).tests![0].status).toBe('output-limit');
  });
  it('forbids the development adapter in production before any Docker command',async()=>{
    vi.stubEnv('NODE_ENV','production');const docker=fakeDocker();await expect(new DockerExecutionAdapter(undefined,docker.command).execute(submission,exercise)).rejects.toThrow('forbidden in production');expect(docker.calls).toHaveLength(0);
  });
});
