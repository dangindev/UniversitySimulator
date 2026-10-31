import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { developmentAuthEnabled, issueDevelopmentToken, authenticate } from './auth.js';
import { ApiError } from './types.js';
import { bodyObject, textField, type UniversityService } from './service.js';
import {verifyAdminIdentity} from './admin-auth.js';
import type {AdminOperations} from './admin-operations.js';

let service:UniversityService;
let administrator:AdminOperations|undefined;
export function configureController(instance:UniversityService,admin?:AdminOperations){service=instance;administrator=admin;}
function adminOperations(){if(!administrator)throw new ApiError(503,'Chưa có dịch vụ quản trị.');return administrator;}
const userRateLimits=new Map<string,{count:number;until:number}>();
const authorization=async(request:Request)=>{
  const id=await authenticate(request.headers.authorization);const now=Date.now();
  let limit=userRateLimits.get(id);
  if(!limit||limit.until<=now){limit={count:0,until:now+60000};userRateLimits.set(id,limit);}
  if(++limit.count>120)throw new ApiError(429,'Bạn thao tác quá nhanh. Hãy thử lại sau một phút.','rate_limited');
  if(userRateLimits.size>10000)for(const[key,value]of userRateLimits)if(value.until<=now)userRateLimits.delete(key);
  return id;
};

@ApiTags('University Simulator')
@ApiBearerAuth()
@Controller()
export class UniversityController {
  @Get('admin/readiness')async adminReadiness(@Req()request:Request){return adminOperations().readiness(await verifyAdminIdentity(request.headers.authorization));}
  @Post('admin/exams/:studentId/:examId/void')async adminVoid(@Req()request:Request,@Param('studentId')studentId:string,@Param('examId')examId:string,@Body()value:unknown){return adminOperations().voidAttempt(await verifyAdminIdentity(request.headers.authorization),studentId,examId,bodyObject(value).reason);}
  @Post('admin/exams/:studentId/:examId/retry')async adminRetry(@Req()request:Request,@Param('studentId')studentId:string,@Param('examId')examId:string,@Body()value:unknown){return adminOperations().retryGrading(await verifyAdminIdentity(request.headers.authorization),studentId,examId,bodyObject(value).reason);}
  @Post('admin/execution')async adminExecution(@Req()request:Request,@Body()value:unknown){const body=bodyObject(value);return adminOperations().setExecutionPaused(await verifyAdminIdentity(request.headers.authorization),body.paused,body.reason);}
  @Get('health')
  @ApiOperation({summary:'Read deployment capabilities; this does not certify Phase 1 readiness.'})
  health(){return {status:'ok',...service.capabilities,serverTime:new Date().toISOString(),executionLimit:10};}

  @Post('auth/dev')
  @ApiOperation({summary:'Local development sign-in. Disabled in production and unless explicitly enabled.'})
  @ApiBody({schema:{type:'object',properties:{displayName:{type:'string'},profile:{type:'string'}}}})
  devAuth(@Body()value:unknown){
    if(!developmentAuthEnabled())throw new ApiError(404,'Đăng nhập phát triển bị tắt.');
    const body=bodyObject(value);
    const profile=body.profile===undefined?'student':textField(body.profile,'Hồ sơ',40);
    if(!/^[a-zA-Z0-9_-]+$/.test(profile))throw new ApiError(400,'Mã hồ sơ phát triển chỉ chứa chữ, số, gạch nối.');
    const id=`dev-${profile}`;
    return {accessToken:issueDevelopmentToken(id),user:{id,displayName:typeof body.displayName==='string'?body.displayName.slice(0,50):'Sinh viên phát triển'},development:true};
  }
  @Get('bootstrap')async bootstrap(@Req()request:Request){return service.bootstrap(await authorization(request));}
  @Get('catalog')async catalog(@Req()request:Request){const bootstrap=await service.bootstrap(await authorization(request));return {courses:bootstrap.courses,programs:bootstrap.programs};}
  @Get('me')async me(@Req()request:Request){return {student:(await service.bootstrap(await authorization(request))).student};}
  @Post('students')async createStudent(@Req()request:Request,@Body()value:unknown){return service.createStudent(await authorization(request),bodyObject(value));}
  @Post('placement')async placement(@Req()request:Request,@Body()value:unknown){return service.placement(await authorization(request),bodyObject(value));}
  @Post('enrollments')async enroll(@Req()request:Request,@Body()value:unknown){return service.enroll(await authorization(request),bodyObject(value));}
  @Post('learning/checkpoint')async checkpoint(@Req()request:Request,@Body()value:unknown){return service.checkpoint(await authorization(request),bodyObject(value));}
  @Post('exams')async startExam(@Req()request:Request,@Body()value:unknown){return service.startExam(await authorization(request),bodyObject(value));}
  @Get('exams/:id')async exam(@Req()request:Request,@Param('id')id:string){return service.exam(await authorization(request),id);}
  @Put('exams/:id/answers')async saveExam(@Req()request:Request,@Param('id')id:string,@Body()value:unknown){return service.saveExam(await authorization(request),id,bodyObject(value));}
  @Post('exams/:id/submit')async submitExam(@Req()request:Request,@Param('id')id:string,@Body()value:unknown){return service.submitExam(await authorization(request),id,bodyObject(value));}
  @Post('practice')async practice(@Req()request:Request,@Body()value:unknown){return service.practice(await authorization(request),bodyObject(value));}
  @Post('projects/:courseId/submit')async project(@Req()request:Request,@Param('courseId')courseId:string,@Body()value:unknown){return service.practice(await authorization(request),{...bodyObject(value),courseId});}
  @Get('submissions/:id')async submission(@Req()request:Request,@Param('id')id:string){return service.submission(await authorization(request),id);}
  @Post('life/activity')async activity(@Req()request:Request,@Body()value:unknown){return service.activity(await authorization(request),bodyObject(value));}
  @Post('skills/office/submit')async submitOffice(@Req()request:Request,@Body()value:unknown){return service.submitOffice(await authorization(request),bodyObject(value));}
  @Post('calendar/advance')async advance(@Req()request:Request,@Body()value:unknown){return service.advance(await authorization(request),bodyObject(value));}
  @Post('credentials')async issueCredential(@Req()request:Request){return service.credential(await authorization(request));}
  @Post('credentials/:code/share')async shareCredential(@Req()request:Request,@Param('code')code:string,@Body()value:unknown){return service.shareCredential(await authorization(request),code,bodyObject(value).enabled);}
  @Get('credentials/:code')async lookupCredential(@Param('code')code:string){return service.lookupCredential(code);}
}
