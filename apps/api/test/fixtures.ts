import {createDevelopmentBank} from '../src/bank.js';
import {introPracticeRequirements} from '@university-simulator/content';
import type {PrivateQuestion,StudentDocument} from '../src/types.js';

/** Small deterministic fixtures for infrastructure rules. The real M1 bank is tested separately. */
export function createTestBank(codeFinal=false){
  const bank=createDevelopmentBank();
  const specs:[string,string,string[],number][]=[
    ['variable','Sau x=3; x=x+2, x là?', ['3','5','2','0'],1],
    ['loop','i nhận 0,1,2,3. Có mấy lượt?', ['3','4','5','0'],1],
    ['branch','Điều kiện nhận số chẵn?', ['n%2==0','n>2','n/2==0','n==2'],0],
    ['function','Tác dụng của tách hàm?', ['Luôn nhanh hơn','Không cần test','Tái sử dụng, kiểm thử độc lập','Không cần đầu vào'],2],
    ['boundary','Ca thử cần có?', ['Chỉ rất lớn','Rỗng và một phần tử','Chỉ tăng dần','Chỉ số dương'],1],
    ['debug','Bước gỡ lỗi hữu ích?', ['Xóa test','Đổi ngẫu nhiên','Tái hiện bằng đầu vào nhỏ','Bỏ điều kiện'],2],
  ];
  const questions:PrivateQuestion[]=specs.map(([id,prompt,options,correct])=>({id,prompt,options:options.map((text,index)=>({id:String(index),text})),correctOption:String(correct),explanation:'Public test fixture.',kind:'choice'}));
  bank.assessments=(['midterm','final'] as const).map(kind=>({id:`fixture-${kind}`,version:'fixture.1',courseId:'intro-programming',kind,durationSeconds:kind==='midterm'?1800:2700,availableWeek:kind==='midterm'?8:16,isPublicDevelopmentSample:true,questions:structuredClone(questions)}));
  if(codeFinal)bank.assessments[1]!.questions.push({id:'intro-final-code',kind:'code',prompt:'Đọc hai số và in tổng.',options:[],correctOption:'',explanation:'Fixture only.',weight:4,requiredPassRatio:0.5,exerciseIds:{cpp:'intro-sum-cpp',python:'intro-sum-python'},starterCodes:{cpp:'int main(){}',python:'# implement'}});
  return bank;
}
export function seedIntroPractice(student:StudentDocument,onlyFinal=false){
  const requirements=introPracticeRequirements(student.track);
  const progress=student.progress['intro-programming']!;
  for(const id of onlyFinal?requirements.finalRequiredIds:requirements.requiredIds)progress.checkpointScores[`code:${id}`]=10;
  progress.checkpointScores['verified-code']=10;
}
