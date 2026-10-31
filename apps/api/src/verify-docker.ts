import {spawn} from 'node:child_process';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../../..');
const child=spawn(process.execPath,[resolve(root,'node_modules/vitest/vitest.mjs'),'run','apps/api/test/docker.integration.test.ts'],{cwd:root,env:{...process.env,NODE_ENV:'test',USIM_DOCKER_INTEGRATION:'1'},stdio:'inherit',windowsHide:true,shell:false});
child.on('exit',code=>{process.exitCode=code??1;});child.on('error',error=>{console.error(error.message);process.exitCode=1;});
