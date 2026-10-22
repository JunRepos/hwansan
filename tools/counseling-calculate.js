function calculate(raw,key){
 const d=variants.find(x=>x.key===key),excluded=[],candidates=[];
 const failure=(message,problems=[])=>({error:message,problems,used:[],excl:excluded,notes:[],score:null,avg:null,n:0,credit:0,partial:true});
 if(!d)return failure('전형을 찾지 못했습니다');
 for(const r of raw){
   // A missing date cannot establish whether the row is in the reflection period.
   if(![1,2,3].includes(r.g)||![1,2].includes(r.t))return failure(r.subject+': 학년·학기 확인');
   const why=term(r)>31?'3학년 1학기 이후 — 졸업예정자 기준':scopeExclusion(r,d);
   if(why)excluded.push({r,why});else candidates.push(r);
 }
 const problems=issues(candidates);
 if(problems.length)return failure(problems[0],problems);
 // 나이스에서 읽은 구역(sec)은 그대로 둡니다. 원점수·평균이 적힌 '일반' 구역인지가 고려대 등 일부 규칙에 쓰입니다.
 const rows=candidates.map(r=>{const p=identify(r);return {...r,area:p.area,kindOverride:p.kind,sec:r.sec||(['과탐실','체육예술'].includes(p.kind)?'체육예술':p.kind==='교양P'?'교양':'일반')}});
 const missing=[];
 rows.forEach(r=>{
   const label=r.g+'-'+r.t+' '+r.subject;
   if(d.e.id==='s-mtheo'){
     if(!Number.isFinite(r.score)||r.score<0||r.score>100)missing.push(label+': 원점수(0~100) 필요');
     if(!Number.isInteger(r.count)||r.count<=0)missing.push(label+': 수강자수 필요');
   }
   if(d.e.id==='s-sungshin'&&r.rank){
     if(!Number.isInteger(r.count)||r.count<=0)missing.push(label+': 수강자수 필요');
     const match=new RegExp(r.ach+'\\(([\\d.]+)\\)').exec(r.dist||'');
     if(!match||+match[1]>100)missing.push(label+': '+r.ach+' 성취도 분포비율 필요');
   }
 });
 if(missing.length)return failure(missing.join(' / '),missing);
 if(!rows.length)return {used:[],excl:excluded,notes:['반영 대상 과목이 없습니다.'],score:null,avg:null,n:0,credit:0,partial:true};
 try{
   const res=SEOUL.run(rows,d.v,d.e.id);res.excl=res.excl.concat(excluded);
   const hard=res.notes.find(s=>/진로선택 반영 규칙은 아직/.test(s));
   if(hard){res.score=null;res.avg=null;res.error='반영 후보 진로선택 과목의 산출 규칙 확인 필요';}
   if(!res.used.length){res.score=null;res.avg=null;}
   if(!Number.isFinite(res.score))res.score=null;if(!Number.isFinite(res.avg))res.avg=null;
   if(res.used.some(x=>x.pt!=null&&!Number.isFinite(x.pt))){res.score=null;res.error='반영 과목의 배점 산출값 확인 필요';}
   if(d.e.id==='s-skku'&&(!res.used.some(x=>x.r.kind==='공통')||!res.used.some(x=>x.r.kind!=='공통'))){res.score=null;res.notes.push('공통·선택 두 과목군 성적이 있어야 점수를 계산할 수 있습니다.');}
   // Preserve grouping/selection dependencies: a non-selected alternative can
   // still determine the chosen group. Do not validate just res.used.
   if(d.e.id==='s-dongduk'&&new Set(res.used.map(u=>u.r.gyo)).size<4){res.score=null;res.notes.push('필수 4개 교과의 성적이 없어 환산점수 계산 보류');}
   res.partial=/미공개|원문|가정|감점 전|확인|정성|환산 전|계산 보류/.test([res.scoreLabel,...res.notes,...res.excl.map(x=>x.why)].join(' '));
   res.notes.unshift('2028 졸업예정자 · 현재 입력분 중 3학년 1학기까지 집계. 대학 원문 최종 검산 필요.');
   return res;
 }catch(e){return failure('필수 과목군 또는 산출 규칙 확인 필요');}
}
// Difference compares the estimated 9-grade midpoint with one published cutoff.
// It is a descriptive grade difference, never an admission probability.
function gradeComparison(grade,cutoff){
 const range=conversion(grade);if(!range)return null;
 const mid=(range.lo+range.hi)/2,cut=typeof cutoff==='number'&&Number.isFinite(cutoff)&&cutoff>=1&&cutoff<=9?cutoff:null;
 const difference=cut==null?null:(Math.round((mid-cut)*100)/100||0);
 return {...range,mid,cut,difference,overlap:cut==null?null:cut>=range.lo&&cut<=range.hi};
}
