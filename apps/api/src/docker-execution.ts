import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import type {ExecutionAdapter,ExecutionResult} from './execution.js';
import type {ExecutionTestResult,PrivateExercise,Submission} from './types.js';

export interface CommandResult {code:number;stdout:string;stderr:string;timedOut:boolean;outputLimited:boolean}
export type DockerCommand=(args:string[],input:string|undefined,timeoutMs:number,maximumOutput?:number)=>Promise<CommandResult>;
export interface DockerAvailability {available:boolean;reason:string;imageId?:string;runtimes?:Record<string,string>}

/** The host starts only the Docker CLI. Learner source is stdin DATA, never a host command or file. */
export const runDockerCommand:DockerCommand=(args,input,timeoutMs,maximumOutput=32768)=>new Promise((resolve,reject)=>{
  const child=spawn('docker',args,{shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
  const stdout:Buffer[]=[];const stderr:Buffer[]=[];let total=0,timedOut=false,outputLimited=false;
  const timer=setTimeout(()=>{timedOut=true;child.kill();},timeoutMs);
  const capture=(target:Buffer[],chunk:Buffer)=>{
    total+=chunk.length;
    if(total>maximumOutput){outputLimited=true;child.kill();return;}
    target.push(chunk);
  };
  child.stdout.on('data',(chunk:Buffer)=>capture(stdout,chunk));child.stderr.on('data',(chunk:Buffer)=>capture(stderr,chunk));
  child.on('error',error=>{clearTimeout(timer);reject(error);});
  child.on('close',code=>{clearTimeout(timer);resolve({code:code??-1,stdout:Buffer.concat(stdout).toString('utf8'),stderr:Buffer.concat(stderr).toString('utf8'),timedOut,outputLimited});});
  child.stdin.on('error',()=>undefined);child.stdin.end(input);
});

const normalize=(value:string)=>value.replaceAll('\r\n','\n').trim();
export function isolatedDockerArguments(name:string,imageId:string,jobId?:string){
  if(!/^usim-[a-z0-9-]+$/.test(name)||!/^sha256:[a-f0-9]{64}$/.test(imageId))throw new Error('Invalid isolated runner identity.');
  if(jobId!==undefined&&!/^[a-zA-Z0-9-]{1,128}$/.test(jobId))throw new Error('Invalid isolated job label.');
  return ['run','--rm','--name',name,'--label','app=university-simulator',...(jobId?['--label',`usim.job=${jobId}`]:[]),'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--user','65532:65532','--pids-limit','64','--memory','512m','--memory-swap','512m','--cpus','1','--ulimit','nofile=64:64','--ulimit','nproc=64:64','--ulimit','core=0:0','--tmpfs','/work:rw,exec,nosuid,nodev,size=64m,uid=65532,gid=65532,mode=700','--tmpfs','/tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777','--ipc','none','--log-driver','none','--init','--interactive',imageId];
}

export class DockerExecutionAdapter implements ExecutionAdapter {
  private cached:DockerAvailability={available:false,reason:'Chưa kiểm tra Docker Engine.'};
  private checkedAt=0;
  private probing:Promise<DockerAvailability>|undefined;
  private verifiedImage:{id:string;runtimes:Record<string,string>}|undefined;
  constructor(readonly image=process.env.LOCAL_RUNNER_IMAGE??'university-simulator-runner:local',readonly command:DockerCommand=runDockerCommand){}
  async probe(force=false):Promise<DockerAvailability>{
    if(!force&&Date.now()-this.checkedAt<(this.cached.available?30000:5000))return this.cached;
    if(this.probing)return this.probing;
    this.probing=this.inspect().then(value=>{this.cached=value;this.checkedAt=Date.now();return value;}).finally(()=>{this.probing=undefined;});
    return this.probing;
  }
  private async inspect():Promise<DockerAvailability>{
    try{
      if(!/^[a-z0-9][a-z0-9./:_-]{0,199}$/i.test(this.image))return {available:false,reason:'Tên image chấm local không hợp lệ.'};
      const engine=await this.command(['version','--format','{{.Server.Os}}'],undefined,4000,8192);
      if(engine.code!==0||engine.stdout.trim()!=='linux')return {available:false,reason:'Docker Engine Linux chưa chạy. Mở Docker Desktop và đợi engine sẵn sàng.'};
      const image=await this.command(['image','inspect','--format','{{.Id}}',this.image],undefined,4000,8192);
      const imageId=image.stdout.trim();
      if(image.code!==0||!/^sha256:[a-f0-9]{64}$/.test(imageId))return {available:false,reason:'Chưa có image chấm local. Chạy lệnh build trong infra/local/README.md.'};
      if(this.verifiedImage?.id===imageId)return {available:true,reason:'Docker local sẵn sàng: C++20, Python, JavaScript và SQLite.',imageId,runtimes:this.verifiedImage.runtimes};
      const name=`usim-probe-${randomUUID()}`;
      try{
        const probe=await this.command([...isolatedDockerArguments(name,imageId),'--probe'],undefined,12000,16384);
        if(probe.code!==0||probe.timedOut||probe.outputLimited)return {available:false,reason:'Image chấm local chưa vượt kiểm tra cách ly và runtime.'};
        const info=JSON.parse(probe.stdout) as {protocol:number;uid:number;runtimes:Record<string,string>};
        if(info.protocol!==1||info.uid!==65532||!info.runtimes.cpp||!info.runtimes.python||!info.runtimes.javascript)return {available:false,reason:'Image chấm local không đúng phiên bản hoặc đang chạy bằng quyền không phù hợp.'};
        this.verifiedImage={id:imageId,runtimes:info.runtimes};
        return {available:true,reason:'Docker local sẵn sàng: C++20, Python, JavaScript và SQLite.',imageId,runtimes:info.runtimes};
      }finally{await this.command(['rm','--force',name],undefined,4000,8192).catch(()=>undefined);}
    }catch{return {available:false,reason:'Không kết nối được Docker Linux. Không chạy mã người học trên máy chủ ứng dụng.'};}
  }
  async execute(submission:Submission,exercise:PrivateExercise):Promise<ExecutionResult>{
    if(process.env.NODE_ENV==='production')throw new Error('Local Docker execution is forbidden in production.');
    const available=await this.probe();if(!available.available||!available.imageId)throw new Error(available.reason);
    const deadline=Date.now()+(exercise.timeoutSeconds+15)*1000;
    const results:ExecutionTestResult[]=[];let passed=0,output='',compileErrors:string|undefined;
    for(let index=0;index<exercise.tests.length;index++){
      const test=exercise.tests[index]!;const name=`usim-${randomUUID()}`;let status:ExecutionTestResult['status']='runtime-error',actual='',diagnostic='';
      try{
        const remaining=deadline-Date.now();
        if(remaining<=0){status='time-limit';diagnostic='Đã hết thời gian của toàn bài.';}
        else{
          const result=await this.command(isolatedDockerArguments(name,available.imageId,submission.id),JSON.stringify({language:submission.language,source:submission.source,input:test.input}),Math.min(15000,remaining),32768);
          if(result.timedOut){status='time-limit';diagnostic='Chương trình vượt giới hạn thời gian.';}
          else if(result.outputLimited){status='output-limit';diagnostic='Đầu ra hoặc chẩn đoán vượt giới hạn cho phép.';}
          else if([125,126,127].includes(result.code))throw new Error('Docker engine could not start the isolated container.');
          else{
            let payload:{protocol:number;status:string;output:string;diagnostic:string};
            try{payload=JSON.parse(result.stdout);}catch{payload={protocol:0,status:'runtime-error',output:'',diagnostic:'Tiến trình kết thúc bất thường hoặc làm hỏng giao thức đầu ra.'};}
            if(payload.protocol!==1||typeof payload.output!=='string'||payload.output.length>12000){status='runtime-error';diagnostic='Đầu ra không đúng giao thức giới hạn.';}
            else{
              actual=Buffer.from(payload.output,'base64').toString('utf8').slice(0,8192);diagnostic=typeof payload.diagnostic==='string'?payload.diagnostic.slice(0,2048):'';
              if(payload.status==='compile-error'){compileErrors=diagnostic;status='runtime-error';}
              else if(payload.status==='time-limit')status='time-limit';
              else if(payload.status==='output-limit')status='output-limit';
              else if(result.code===0&&payload.status==='ok')status=normalize(actual)===normalize(test.expected)?'passed':'wrong-answer';
              else status='runtime-error';
            }
          }
        }
      }finally{await this.command(['rm','--force',name],undefined,4000,8192).catch(()=>undefined);}
      if(status==='passed')passed++;
      if(test.public&&!output)output=actual;
      results.push({index:index+1,public:Boolean(test.public),status,...(test.public?{input:test.input.slice(0,2048),expected:test.expected.slice(0,2048),actual:actual.slice(0,8192),diagnostic}: {})});
      if(compileErrors){
        for(let next=index+1;next<exercise.tests.length;next++)results.push({index:next+1,public:Boolean(exercise.tests[next]!.public),status:'runtime-error',...(exercise.tests[next]!.public?{diagnostic:'Chưa chạy vì mã nguồn không biên dịch được.'}:{})});
        break;
      }
    }
    return {passed,total:exercise.tests.length,feedback:passed===exercise.tests.length?'Chương trình đạt tất cả kiểm thử trong Docker cô lập.':'Có kiểm thử chưa đạt. Xem đầu vào công khai, kết quả và chẩn đoán để sửa chương trình.',output,tests:results,compileErrors};
  }
}
