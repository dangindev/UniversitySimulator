/**
 * Teacher-only verifier. Host execution is limited to the authored reference/mutation strings
 * imported below. This CLI does not accept a source file, submission ID, learner data, or code.
 * API/worker code must never import this script or reuse it as a submission executor.
 */
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { practiceReferences, getLessons, introOutcomes, introTopicOrder } from '@university-simulator/content';
import { developmentAssessmentReferences, developmentAssessmentMutants, INTRO_DEVELOPMENT_VERSION, introAssessmentCoverage } from '../apps/api/src/development-intro.js';

export interface TrustedVerificationJob {
  id: string; exerciseId: string; language: 'cpp' | 'python'; source: string;
  tests: { input: string; output: string }[]; expectedOutcome: 'pass' | 'killed'; sourceHash: string;
}
export interface IntroReferenceResult {
  id: string; exerciseId: string; language: 'cpp' | 'python'; expectedOutcome: 'pass' | 'killed';
  sourceHash: string; compiled: boolean; testsPassed: number; totalTests: number; success: boolean;
  failedCases: { index: number; expected: string; actual: string; exitCode: number; timeout: boolean }[];
  diagnostic?: string;
}

export function validateVerifierArguments(args: readonly string[]): { json: boolean } {
  if (args.length > 1 || args.some(argument => argument !== '--json')) throw new Error('Usage: verify-intro [--json]. Source paths, submission IDs and learner input are not accepted.');
  return { json: args.includes('--json') };
}

/** The source set is fixed by trusted repository modules, never by CLI parameters or HTTP input. */
export function trustedIntroVerificationJobs(): TrustedVerificationJob[] {
  const references = [
    ...practiceReferences.map(reference => ({ ...reference, id: reference.exerciseId })),
    ...developmentAssessmentReferences.map(reference => ({ ...reference, id: reference.exerciseId })),
  ];
  const jobs: TrustedVerificationJob[] = references.map(reference => ({
    id: reference.id, exerciseId: reference.exerciseId, language: reference.language, source: reference.source,
    tests: reference.tests.map(test => ({ input: test.input, output: test.output })), expectedOutcome: 'pass',
    sourceHash: createHash('sha256').update(reference.source).digest('hex'),
  }));
  for (const mutant of developmentAssessmentMutants) {
    const reference = developmentAssessmentReferences.find(item => item.exerciseId === mutant.exerciseId);
    if (!reference) throw new Error(`Authored mutation has no trusted test contract: ${mutant.id}`);
    jobs.push({ id: mutant.id, exerciseId: mutant.exerciseId, language: mutant.language, source: mutant.source, tests: reference.tests.map(test => ({ input: test.input, output: test.output })), expectedOutcome: 'killed', sourceHash: createHash('sha256').update(mutant.source).digest('hex') });
  }
  if (new Set(jobs.map(job => job.id)).size !== jobs.length) throw new Error('Trusted verification job IDs must be unique.');
  if (jobs.length === 0 || jobs.length > 256) throw new Error('Trusted verification job count is outside the supported bound.');
  for (const job of jobs) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(job.id) || !['cpp', 'python'].includes(job.language) || !job.source || job.source.length > 64000 || job.tests.length === 0 || job.tests.length > 100 || job.tests.some(test => test.input.length > 131072 || test.output.length > 8192)) throw new Error(`Invalid authored reference contract: ${job.id}`);
  }
  return jobs;
}

function subprocessEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) if (/^(path|systemroot|windir|temp|tmp|home|userprofile|appdata|localappdata|lang|lc_all)$/i.test(key)) environment[key] = value;
  return { ...environment, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' };
}

function command(commandName: string, args: string[], onLine?: (line: string) => void): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolveCommand, reject) => {
    const process = spawn(commandName, args, { windowsHide: true, shell: false, env: subprocessEnvironment(), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', pending = '';
    process.stdout.setEncoding('utf8'); process.stderr.setEncoding('utf8');
    process.stdout.on('data', (chunk: string) => { stdout += chunk; pending += chunk; let index: number; while ((index = pending.indexOf('\n')) >= 0) { const line = pending.slice(0, index); pending = pending.slice(index + 1); onLine?.(line); } });
    process.stderr.on('data', (chunk: string) => { stderr = (stderr + chunk).slice(-10000); });
    process.once('error', reject);
    process.once('close', code => { if (pending) onLine?.(pending); resolveCommand({ code: code ?? 1, stdout, stderr }); });
  });
}

// This controller only runs generated numbered files whose hashes are checked against the authored plan.
const trustedRunner = String.raw`import base64, hashlib, json, os, pathlib, signal, subprocess, sys, threading
base = pathlib.Path(__file__).resolve().parent
manifest_path = pathlib.Path(sys.argv[1]).resolve()
if manifest_path.parent != base or manifest_path.name not in ('cpp-manifest.json', 'python-manifest.json'):
    raise RuntimeError('Only the generated trusted manifest is accepted')
jobs = json.loads(manifest_path.read_text(encoding='utf-8'))
def bounded_run(args, input_text='', timeout=3):
    kwargs = {'cwd': str(base), 'stdin': subprocess.PIPE, 'stdout': subprocess.PIPE, 'stderr': subprocess.PIPE}
    if os.name == 'nt': kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
    else: kwargs['start_new_session'] = True
    process = subprocess.Popen(args, **kwargs)
    stdout, stderr, overflow = bytearray(), bytearray(), [False]
    def stop():
        try:
            if os.name != 'nt': os.killpg(process.pid, signal.SIGKILL)
            else: process.kill()
        except ProcessLookupError: pass
    def read(pipe, result):
        while True:
            chunk = pipe.read(4096)
            if not chunk: break
            if len(result) + len(chunk) > 65536:
                overflow[0] = True
                stop()
                break
            result.extend(chunk)
    def write():
        try:
            process.stdin.write(input_text.encode('utf-8'))
            process.stdin.close()
        except (BrokenPipeError, OSError): pass
    threads = [threading.Thread(target=read, args=(process.stdout,stdout), daemon=True), threading.Thread(target=read, args=(process.stderr,stderr), daemon=True), threading.Thread(target=write, daemon=True)]
    for thread in threads: thread.start()
    timed_out = False
    try: process.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        timed_out = True
        stop()
        process.wait(timeout=3)
    for thread in threads: thread.join(timeout=2)
    return {'code': process.returncode, 'stdout': stdout.decode('utf-8',errors='replace'), 'stderr': stderr.decode('utf-8',errors='replace'), 'timeout': timed_out or overflow[0]}
def normalize(value): return value.replace('\r\n','\n').strip()
for job in jobs:
    source = (base / job['sourceFile']).resolve()
    if source.parent != base or not source.name.startswith('authored-'):
        raise RuntimeError('Source is outside the generated trusted reference directory')
    if hashlib.sha256(source.read_bytes()).hexdigest() != job['sourceHash']:
        raise RuntimeError('Authored reference hash mismatch')
    result = {key: job[key] for key in ('id','exerciseId','language','expectedOutcome','sourceHash')}
    result.update({'compiled': False, 'testsPassed': 0, 'totalTests': len(job['tests']), 'failedCases': [], 'success': False})
    binary = base / (source.stem + '.bin')
    compile_args = ['g++','-std=c++20','-O2','-Wall','-Wextra',str(source),'-o',str(binary)] if job['language']=='cpp' else [sys.executable,'-I','-m','py_compile',str(source)]
    compiled = bounded_run(compile_args, timeout=40)
    result['compiled'] = compiled['code']==0 and not compiled['timeout']
    if not result['compiled']:
        result['diagnostic'] = compiled['stderr'][:2000] or 'Compiler/interpreter verification failed'
    else:
        for index,test in enumerate(job['tests']):
            args = [str(binary)] if job['language']=='cpp' else [sys.executable,'-I',str(source)]
            actual = bounded_run(args, test['input'])
            if actual['code']==0 and not actual['timeout'] and normalize(actual['stdout'])==normalize(test['output']):
                result['testsPassed'] += 1
            else:
                result['failedCases'].append({'index':index,'expected':normalize(test['output'])[:200],'actual':normalize(actual['stdout'])[:200],'exitCode':actual['code'],'timeout':actual['timeout']})
        result['success'] = result['testsPassed']==result['totalTests'] if job['expectedOutcome']=='pass' else len(result['failedCases'])>0
    print(json.dumps(result,ensure_ascii=False),flush=True)
`;

export async function verifyIntroReferences(options: { json?: boolean } = {}) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const jobs = trustedIntroVerificationJobs();
  const directory = resolve(root, '.data', 'intro-verification', `${Date.now()}-${randomUUID().slice(0, 8)}`);
  const python = process.platform === 'win32' ? 'python' : 'python3';
  const pythonVersion = await command(python, ['--version']);
  if (pythonVersion.code !== 0) throw new Error('Python 3 is required to verify authored references.');
  const compilerVersion = process.platform === 'win32' ? await command('wsl.exe', ['-d', 'Ubuntu', '--', 'g++', '--version']) : await command('g++', ['--version']);
  if (compilerVersion.code !== 0) throw new Error('C++20 g++ is required (Windows: WSL Ubuntu). No learner-submission fallback is available.');
  await mkdir(directory, { recursive: true });
  const runnerPath = join(directory, 'trusted-reference-runner.py'); await writeFile(runnerPath, trustedRunner, 'utf8');
  const manifests: Record<'cpp' | 'python', unknown[]> = { cpp: [], python: [] };
  for (const [index, job] of jobs.entries()) {
    const sourceFile = `authored-${String(index).padStart(3, '0')}.${job.language === 'cpp' ? 'cpp' : 'py'}`;
    await writeFile(join(directory, sourceFile), job.source, 'utf8');
    manifests[job.language].push({ ...job, source: undefined, sourceFile });
  }
  for (const language of ['cpp', 'python'] as const) await writeFile(join(directory, `${language}-manifest.json`), JSON.stringify(manifests[language]), 'utf8');
  const results: IntroReferenceResult[] = [];
  const progress = (line: string) => {
    const result = JSON.parse(line) as IntroReferenceResult; results.push(result);
    if (!options.json && (results.length % 10 === 0 || !result.success)) console.log(`Authored references ${results.length}/${jobs.length}: ${result.success ? 'verified' : `FAILED ${result.id}`}`);
  };
  let cppArgs: string[];
  if (process.platform === 'win32') {
    const converted = await command('wsl.exe', ['-d', 'Ubuntu', '--', 'wslpath', '-a', directory]);
    if (converted.code !== 0 || !converted.stdout.trim().startsWith('/')) throw new Error('Cannot resolve the generated reference directory inside WSL.');
    const unixDirectory = converted.stdout.trim();
    cppArgs = ['-d', 'Ubuntu', '--', 'python3', '-I', `${unixDirectory}/trusted-reference-runner.py`, `${unixDirectory}/cpp-manifest.json`];
  } else cppArgs = ['-I', runnerPath, join(directory, 'cpp-manifest.json')];
  const executions = await Promise.all([
    command(process.platform === 'win32' ? 'wsl.exe' : python, cppArgs, progress),
    command(python, ['-I', runnerPath, join(directory, 'python-manifest.json')], progress),
  ]);
  const failed = results.filter(result => !result.success);
  const report = {
    version: INTRO_DEVELOPMENT_VERSION, at: new Date().toISOString(), purpose: 'trusted-authored-reference-verification-only',
    learnerSubmissionsExecutedOnHost: false, independentAcademicReview: false, publicLaunchReady: false,
    toolchains: { python: pythonVersion.stdout.trim() || pythonVersion.stderr.trim(), cpp: compilerVersion.stdout.split(/\r?\n/)[0] },
    coverage: { topicsPerTrack: introTopicOrder.length, lessons: (['cpp', 'python'] as const).map(track => ({ track, count: getLessons('intro-programming', track).length })), outcomes: introOutcomes.map(outcome => outcome.id), assessments: introAssessmentCoverage.map(assessment => ({ id: assessment.assessmentId, choiceQuestions: assessment.choiceQuestions.length, codingTasks: assessment.codeExerciseIds.length })) },
    programs: jobs.length, correctReferences: jobs.filter(job => job.expectedOutcome === 'pass').length,
    authoredMutants: jobs.filter(job => job.expectedOutcome === 'killed').length,
    testsExecuted: results.reduce((sum, result) => sum + (result.compiled ? result.totalTests : 0), 0),
    verifiedReferences: results.filter(result => result.expectedOutcome === 'pass' && result.success).length,
    killedMutants: results.filter(result => result.expectedOutcome === 'killed' && result.success).length,
    success: results.length === jobs.length && failed.length === 0 && executions.every(execution => execution.code === 0),
    failures: failed, results,
    processErrors: executions.filter(execution => execution.code !== 0).map(execution => execution.stderr.slice(-3000)),
    artifactDirectory: directory,
  };
  await writeFile(join(directory, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
  await writeFile(resolve(root, '.data', 'intro-verification', 'latest.json'), JSON.stringify(report, null, 2), 'utf8');
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else console.log(JSON.stringify({ success: report.success, programs: report.programs, verifiedReferences: report.verifiedReferences, killedMutants: report.killedMutants, testsExecuted: report.testsExecuted, toolchains: report.toolchains, failures: report.failures.map(result => ({ id: result.id, diagnostic: result.diagnostic, failedCases: result.failedCases })), artifactDirectory: directory }, null, 2));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { const report = await verifyIntroReferences(validateVerifierArguments(process.argv.slice(2))); if (!report.success) process.exitCode = 1; }
  catch (error) { console.error('Trusted introductory reference verification failed:', error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; }
}
