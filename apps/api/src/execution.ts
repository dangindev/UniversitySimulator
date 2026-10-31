import { Sandbox, CommandExitError } from 'e2b';
import type { PrivateExercise, Submission,GradingResult } from './types.js';

export type ExecutionResult = GradingResult;
export interface ExecutionAdapter {
  execute(submission: Submission, exercise: PrivateExercise): Promise<ExecutionResult>;
}

const normalize = (value: string) => value.replaceAll('\r\n','\n').trim();

export async function readBoundedOutput(sandbox:Pick<Sandbox,'commands'>):Promise<string>{
  // Read as the trusted control-plane user, with Python isolated from learner modules and startup files.
  // NOFOLLOW rejects symlinks, NONBLOCK prevents FIFO hangs, fstat rejects devices, and os.read has a hard cap.
  const script="import os,stat,base64; f=os.open('/home/user/output.txt',os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK); s=os.fstat(f); assert stat.S_ISREG(s.st_mode) and s.st_size<=8192; print(base64.b64encode(os.read(f,8192)).decode()); os.close(f)";
  let encoded='';
  const result=await sandbox.commands.run(`/usr/bin/python3 -I -c "${script}"`,{
    user:'root',cwd:'/tmp',timeoutMs:2000,retainOutput:false,
    onStdout:chunk=>{if(encoded.length+chunk.length>12000)throw new Error('Output limit exceeded.');encoded+=chunk;},
  });
  if(result.exitCode!==0)throw new Error('Output is not a bounded regular file.');
  return Buffer.from(encoded.trim(),'base64').toString('utf8');
}

export class E2BExecutionAdapter implements ExecutionAdapter {
  async execute(submission: Submission, exercise: PrivateExercise): Promise<ExecutionResult> {
    const template = exercise.templateId || process.env.E2B_TEMPLATE_ID;
    if (!template || !process.env.E2B_API_KEY) throw new Error('Isolated execution is not configured.');
    const sandbox = await Sandbox.create(template, {
      apiKey: process.env.E2B_API_KEY,
      allowInternetAccess: false,
      network: { allowPublicTraffic: false },
      timeoutMs: (exercise.timeoutSeconds + 15) * 1000,
    });
    try {
      const extension = {cpp:'cpp',python:'py',javascript:'js',sql:'sql'}[submission.language];
      await sandbox.files.write(`/home/user/main.${extension}`, submission.source,{user:'user',requestTimeoutMs:5000,signal:AbortSignal.timeout(5000)});
      if (submission.language === 'cpp') {
        const compiled = await sandbox.commands.run('cd /home/user && timeout -s KILL 15 sh -c "ulimit -f 16384; g++ -std=c++20 -O1 main.cpp -o main >compile.log 2>&1"', {timeoutMs:16000,user:'user',retainOutput:false}).catch(error=>{if(error instanceof CommandExitError)return error;throw error;});
        if (compiled.exitCode !== 0) return {passed:0,total:exercise.tests.length,feedback:'Biên dịch thất bại. Kiểm tra cú pháp C++ và tên hàm main.'};
      }
      if (submission.language === 'sql') {
        await sandbox.files.write('/home/user/sql_runner.py', [
          'import sqlite3, json, pathlib',
          'db = sqlite3.connect(":memory:")',
          'db.executescript(pathlib.Path("input.txt").read_text())',
          'db.set_authorizer(lambda action, arg1, arg2, database, source: sqlite3.SQLITE_DENY if action in (sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH) else sqlite3.SQLITE_OK)',
          'query = pathlib.Path("main.sql").read_text()',
          'cursor = db.execute(query)',
          'print(json.dumps(cursor.fetchall(), ensure_ascii=False, separators=(",",":")))',
        ].join('\n'),{user:'user',requestTimeoutMs:5000,signal:AbortSignal.timeout(5000)});
      }
      const command = {
        cpp:'./main',python:'python3 -I main.py',javascript:'node --max-old-space-size=128 main.js',sql:'python3 -I sql_runner.py',
      }[submission.language];
      let passed=0;let publicOutput='';
      const deadline = Date.now()+exercise.timeoutSeconds*1000;
      for (const test of exercise.tests) {
        if (Date.now() >= deadline) return {passed,total:exercise.tests.length,feedback:'Đã hết giới hạn thực thi cho bài này.'};
        await sandbox.files.write('/home/user/input.txt',test.input,{user:'user',requestTimeoutMs:5000,signal:AbortSignal.timeout(5000)});
        const run = await sandbox.commands.run(`cd /home/user && timeout -s KILL 5 sh -c 'ulimit -f 64; ulimit -t 4; ${command} < input.txt > output.txt 2> errors.txt'`, {timeoutMs:6000,user:'user',retainOutput:false}).catch(error=>{if(error instanceof CommandExitError)return error;throw error;});
        if (run.exitCode !== 0) continue;
        let output:string;
        try{output=await readBoundedOutput(sandbox);}catch{continue;}
        if (normalize(output)===normalize(test.expected))passed++;
        if (test.public)publicOutput=output;
      }
      return {passed,total:exercise.tests.length,feedback:passed===exercise.tests.length?'Chương trình đạt tất cả kiểm thử.':'Có kiểm thử chưa đạt. Kiểm tra dữ liệu biên, định dạng đầu ra và thuật toán.',output:publicOutput};
    } finally {
      await sandbox.kill().catch(()=>undefined);
    }
  }
}
