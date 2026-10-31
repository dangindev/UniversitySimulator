import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { Catch, Module, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { configureController, UniversityController } from './controller.js';
import { createStore } from './store.js';
import { UniversityService, type Capabilities } from './service.js';
import { loadAssessmentBank } from './bank.js';
import { developmentAuthEnabled } from './auth.js';
import { ApiError } from './types.js';
import { assertProductionContentReady } from './production-content.js';
import { startOutboxDispatcher,gradingPreflight } from './queue.js';
import {VerifiedRateLimiter} from './rate-limiter.js';
import {AdminOperations,createRedisExecutionControl} from './admin-operations.js';

config({path:resolve(process.cwd(),'../../.env'),quiet:true});
config({quiet:true});

@Catch()
class ApplicationErrorFilter implements ExceptionFilter {
  catch(error:unknown,host:ArgumentsHost){
    const response=host.switchToHttp().getResponse<Response>();
    if(error instanceof ApiError){response.status(error.status).json({error:error.code,message:error.message});return;}
    const httpError=error as {getStatus?:()=>number;message?:string};
    const status=httpError.getStatus?.()??500;
    if(status>=500)console.error('API operation failed:',error instanceof Error?error.message:'Unknown error');
    response.status(status).json({error:status>=500?'internal_error':'invalid_request',message:status>=500?'Hệ thống gặp sự cố. Tiến độ đã lưu vẫn được bảo toàn.':httpError.message??'Yêu cầu không hợp lệ.'});
  }
}

@Module({controllers:[UniversityController]})
class ApplicationModule{}

function validateProduction(){
  if(process.env.NODE_ENV!=='production')return;
  if(process.env.ENABLE_DEV_AUTH==='true'||process.env.ENABLE_DEV_ASSESSMENTS==='true')throw new Error('Development authentication and public assessment samples are forbidden in production.');
  for(const key of ['DATABASE_URL','SUPABASE_URL','SUPABASE_ANON_KEY','CORS_ORIGIN','REDIS_URL','E2B_API_KEY','E2B_TEMPLATE_ID','ASSESSMENT_BANK_PATH','CONTENT_MANIFEST_PATH']){
    if(!process.env[key])throw new Error(`${key} is required in production.`);
  }
  const manifest:unknown=JSON.parse(readFileSync(process.env.CONTENT_MANIFEST_PATH!,'utf8'));
  assertProductionContentReady(manifest);
}

export async function startServer(){
  validateProduction();
  const bank=loadAssessmentBank();
  const store=await createStore();
  const codeExecution=Boolean(process.env.E2B_API_KEY&&process.env.E2B_TEMPLATE_ID&&process.env.REDIS_URL&&bank);
  const capabilities:Capabilities={developmentAuth:developmentAuthEnabled(),assessmentMode:bank?(bank.development?'development-samples':'private-reviewed'):'unavailable',codeExecution,productionReady:process.env.NODE_ENV==='production',curriculumVersion:'2026.v1',contentStatus:'authored-draft; academic review required'};
  const executionControl=createRedisExecutionControl();
  const service=new UniversityService(store,bank,capabilities,Date.now,()=>gradingPreflight(executionControl));
  configureController(service,new AdminOperations(service,store,{executionControl}));
  const app=await NestFactory.create(ApplicationModule,{bodyParser:true,logger:['error','warn','log']});
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  const origins=(process.env.CORS_ORIGIN??'http://localhost:5173,http://127.0.0.1:5173').split(',').map(value=>value.trim());
  app.enableCors({origin:origins,methods:['GET','POST','PUT'],allowedHeaders:['Authorization','Content-Type'],credentials:false});
  const limiter=new VerifiedRateLimiter();
  app.use((req:Request,res:Response,next:NextFunction)=>{
    void limiter.check({ip:req.ip??req.socket.remoteAddress??'unknown',path:req.path,method:req.method,authorization:req.headers.authorization}).then(decision=>{
      if(!decision.allowed){res.setHeader('Retry-After',decision.retryAfterSeconds??60);res.status(429).json({error:'rate_limited',message:'Quá nhiều yêu cầu. Hãy thử lại sau một phút.'});return;}
      next();
    }).catch(()=>{res.status(503).json({error:'rate_limit_unavailable',message:'Chưa thể kiểm tra giới hạn truy cập. Hãy thử lại.'});});
  });
  app.useGlobalFilters(new ApplicationErrorFilter());
  const swaggerConfig=new DocumentBuilder().setTitle('University Simulator API').setDescription('Versioned academic, assessment and student-life APIs. Public development samples do not meet the Phase 1 launch gate.').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('api/docs',app,SwaggerModule.createDocument(app,swaggerConfig));
  const dispatcher=codeExecution?startOutboxDispatcher(store,executionControl):{close:async()=>undefined};
  let sweeping=false;
  const examSweep=setInterval(async()=>{
    if(sweeping)return;sweeping=true;
    try{for(const id of await store.examReconciliationStudents(new Date().toISOString()))await service.reconcileExams(id);}
    catch(error){console.error('Exam reconciliation delayed:',(error as Error).message);}finally{sweeping=false;}
  },2000);examSweep.unref();
  const host=process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1';
  const port=Number(process.env.PORT??3001);
  await app.listen(port,host);
  console.log(`University Simulator API: http://${host}:${port}/api/v1/health`);
  const close=async()=>{clearInterval(examSweep);await dispatcher.close();await executionControl?.close?.();await app.close();await store.close();};
  process.on('SIGTERM',()=>void close());process.on('SIGINT',()=>void close());
  return {app,store,close};
}

if(process.env.VITEST!=='true')void startServer().catch(error=>{console.error('API startup refused:',error.message);process.exitCode=1;});
