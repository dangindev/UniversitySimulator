import {config} from 'dotenv';
import {resolve} from 'node:path';
import {createStore} from '../../api/src/store.js';
import {loadAssessmentBank,requireBank} from '../../api/src/bank.js';
import {E2BExecutionAdapter} from '../../api/src/execution.js';
import {startGradingWorker} from '../../api/src/queue.js';

config({path:resolve(process.cwd(),'../../.env'),quiet:true});config({quiet:true});
if(!process.env.E2B_API_KEY||!process.env.E2B_TEMPLATE_ID||!process.env.REDIS_URL)throw new Error('Worker requires E2B_API_KEY, E2B_TEMPLATE_ID and REDIS_URL; learner code is never run on the host.');
const store=await createStore();
const bank=requireBank(loadAssessmentBank());
const grading=await startGradingWorker(store,bank,new E2BExecutionAdapter());
console.log('University Simulator grading worker ready; global concurrency is limited to 10.');
const close=async()=>{await grading.close();await store.close();};
process.on('SIGTERM',()=>void close());process.on('SIGINT',()=>void close());
