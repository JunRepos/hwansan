const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../상담.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const context={console,crypto:require('crypto').webcrypto};context.window=context;vm.createContext(context);
scripts.slice(0,-1).forEach(s=>vm.runInContext(s,context));scripts.forEach(s=>new vm.Script(s));
const C=context.Counsel;
const r=(subject,rank=2,credit=4,g=1,t=1,ach='A')=>({subject,rank,credit,g,t,ach,area:C.identify({subject}).area,score:90,count:100,dist:'A(30) B(30) C(20) D(10) E(10)'});
let tests=0;function test(name,fn){fn();console.log('PASS',name);tests++}
test('47 source entries with all variants',()=>assert.equal(context.SEOUL.list.length,47));
test('weighted grade independent reference',()=>assert.equal(C.avg([r('공통국어1',1,4),r('공통수학1',4,2)]),2));
test('official subject distinction and numeral normalization',()=>{assert.equal(C.identify({subject:'미적분I'}).kind,'일반');assert.equal(C.identify({subject:'미적분 II'}).kind,'진로');assert.equal(C.identify({subject:'경제 수학'}).kind,'진로');assert.equal(C.identify({subject:'우리학교 신설과목'}).known,false)});
test('unknown subjects block calculations',()=>assert.ok(C.calculate([{...r('대수'),subject:'미등록'}],'s-seoultech:1').error));
test('semester cutoff and zero score are distinct',()=>{const a=C.calculate([r('공통수학1',1),r('미적분Ⅱ',5,4,3,2)],'s-seoultech:1');assert.equal(a.score,1000);assert.equal(a.excl.length,1);assert.equal(C.calculate([r('공통수학1',5)],'s-seoultech:1').score,0);assert.equal(C.calculate([],'s-dongguk:0').score,null)});
test('humanities and science area selection',()=>{const rows=[r('공통국어1',3),r('통합과학1',1),r('통합사회1',4)];assert.equal(C.calculate(rows,'s-seoultech:0').score,972);assert.equal(C.calculate(rows,'s-seoultech:1').score,988.5)});
test('missing achievement and 9-grade input blocked',()=>{assert.ok(C.calculate([r('공통국어1',2,4,1,1,'')],'s-yonsei:0').error);assert.ok(C.calculate([r('공통국어1',8)],'s-yonsei:0').error)});
test('kookmin career group weights 85/15',()=>{const a=C.calculate([r('공통수학1',1),r('기하',3,2,3,1)],'s-kookmin:1');assert.equal(a.score,985);assert.equal(a.error,undefined)});
test('future sensitivity recomputes weighted score',()=>{const a=C.sensitivity([r('공통수학1',1)],[r('미적분Ⅰ',3,4,2,2)],'s-seoultech:1','score');assert.equal(a[0].up,6.5);assert.equal(a[0].down,5)});
test('per-subject feasible grade set is evaluated against actual target',()=>{const a=C.feasibleRanks([r('공통수학1',1)],[r('미적분Ⅰ',3,4,2,2)],0,'s-seoultech:1','score',990);assert.equal(JSON.stringify(a),'[1,2]')});
test('missing or invalid term cannot silently disappear',()=>{assert.ok(C.calculate([{...r('공통수학1'),g:null}],'s-seoultech:1').error);assert.ok(C.calculate([{...r('공통수학1'),t:3}],'s-seoultech:1').error)});
test('unsupported career rules do not present partial average as complete',()=>{const a=C.calculate([r('공통수학1'),r('기하',2,4,3,1)],'s-duksung:0');assert.equal(a.score,null);assert.equal(a.avg,null);assert.ok(a.error)});
test('top N replaces old subjects',()=>{const rows=Array.from({length:20},(_,i)=>({...r('과목'+i,4,3),kindOverride:'일반',area:'국어'}));const a=C.calculate(rows.concat([{...r('문학',1,4,2,2)}]),'s-konkuk:0');assert.equal(a.used.length,20);assert.ok(a.used.some(u=>u.r.subject==='문학'));assert.equal(a.excl.length,1)});
test('multiple sheets, sections, student boundaries, totals',()=>{const a=[['번호','성명','학년','학기','교과','과목','학점'],['1','학생A','1','1','국어','공통국어1','4','90/70','A','A(30)','2','100'],['이수학점 합계',null,null,null,null,null,4],['<체육·예술 / 과학탐구실험>'],['1','학생A','1','1','과학','과학탐구실험1','1','B'],['2','학생B',null,null,'국어','공통국어1','4','A']];const out=C.parseSheets({SheetNames:['안내','성적1','성적2'],Sheets:{안내:[['안내']],성적1:a,성적2:[a[1]]}},{utils:{sheet_to_json:s=>s}});assert.equal(out.students.length,3);assert.equal(out.students[0].rows[1].rank,null);assert.equal(out.students[0].rows[1].ach,'B');assert.equal(out.students[1].rows[0].g,null);assert.equal(out.checks.length,0);assert.notEqual(out.students[0].id,out.students[2].id)});
test('CSV escaped quotes and newlines',()=>{const rows=C.parseCsv('a,b\n"안녕, 반가워","말""하기"\n');assert.equal(rows[1][0],'안녕, 반가워');assert.equal(rows[1][1],'말"하기');assert.throws(()=>C.parseCsv('"bad'))});
test('every rule handles valid common/general/future rows without uncaught exceptions',()=>{const rows=[r('공통국어1'),r('공통수학1'),r('공통영어1'),r('통합사회1'),r('통합과학1'),r('문학',3,4,2,1),r('대수',2,4,2,1),r('기하',1,4,3,1)];C.variants.forEach(d=>{const res=C.calculate(rows,d.key);assert.ok(res.score==null||Number.isFinite(res.score));assert.ok(res.avg==null||Number.isFinite(res.avg))})});
test('mtheo ignores unrelated rows with absent scores and counts',()=>{
 const base=[r('공통국어1'),r('공통영어1'),r('통합사회1')], expected=C.calculate(base,'s-mtheo:0');
 const extra=[{...r('체육1',null),score:null,count:null},{...r('진로와 직업',null,1,1,1,'P'),score:null,count:null},{...r('공통수학1'),score:null,count:null},{...r('과학탐구실험1',null,1),score:null,count:null}];
 const result=C.calculate(base.concat(extra),'s-mtheo:0');assert.equal(result.error,undefined);assert.equal(result.score,90);assert.equal(result.score,expected.score);assert.equal(result.excl.length,4);
});
test('mtheo validates every eligible candidate before maximum selection',()=>{
 const base=[r('공통국어1')],bad={...r('문학',2,4,2,1),score:null};
 assert.match(C.calculate(base.concat(bad),'s-mtheo:0').error,/문학.*원점수/);
 assert.equal(C.calculate(base.concat({...bad,count:29}),'s-mtheo:0').score,90);
 assert.equal(C.calculate(base.concat({...bad,credit:1}),'s-mtheo:0').score,90);
 assert.match(C.calculate(base.concat({...bad,score:99,count:null}),'s-mtheo:0').error,/문학.*수강자수/);
});
test('missing scores outside a university area cannot block or warn',()=>{
 const base=[r('공통국어1'),r('공통수학1'),r('공통영어1'),r('통합사회1')];
 const a=C.calculate(base,'s-sungshin:0'),b=C.calculate(base.concat({...r('물리학'),count:null,dist:''}),'s-sungshin:0');
 assert.equal(a.score,b.score);assert.equal(b.error,undefined);
 assert.match(C.calculate(base.concat({...r('문학'),count:null}),'s-sungshin:0').error,/문학.*수강자수/);
 const c=C.calculate([r('공통국어1'),{...r('물질과 에너지'),ach:'',rank:9}],'s-chugye:0');assert.equal(c.error,undefined);assert.equal(c.score,95);
});
test('excluded future semester invalid fields cannot affect any variant',()=>{
 const base=[r('공통국어1'),r('공통수학1'),r('공통영어1'),r('통합사회1'),r('통합과학1'),r('문학',2,4,2,1)];
 for(const d of C.variants){const a=C.calculate(base,d.key),b=C.calculate(base.concat({...r('미등록',9,0,3,2,''),area:'오류'}),d.key);assert.equal(b.score,a.score,d.label);assert.equal(b.avg,a.avg,d.label);assert.equal(b.error,a.error,d.label)}
});
test('all 70 variants: fixed exclusions do not affect numeric results or block on unused fields',()=>{
 const base=[r('공통국어1',2),r('공통수학1',3),r('공통영어1',2),r('통합사회1',3),r('통합과학1',4),r('문학',2,4,2,1),r('대수',3,4,2,1),r('영어Ⅰ',2,4,2,1)];
 const probes=[r('체육1',null),r('음악',null),r('과학탐구실험1',null,1),r('진로와 직업',null,1,1,1,'P'),r('정보'),r('한문'),r('기하'),r('물질과 에너지'),r('사회문제 탐구',null)];
 let checks=0;const report=[];
 for(const d of C.variants){
   const a=C.calculate(base,d.key);let n=0;
   for(const probe of probes){
     const b=C.calculate(base.concat(probe),d.key),ex=b.excl.find(x=>x.r.subject===probe.subject);
     // These reasons represent fixed exclusions, not alternate-group selection,
     // top-N candidates, bonus credits or penalty-only subjects.
     if(!ex||!C.scopeExclusion(probe,d))continue;
     assert.equal(b.score,a.score,d.label+' '+probe.subject);assert.equal(b.avg,a.avg,d.label+' '+probe.subject);assert.equal(b.error,a.error,d.label+' '+probe.subject);
     const bad={...probe,rank:9,ach:'',score:null,count:null,dist:''};
     const c=C.calculate(base.concat(bad),d.key);assert.equal(c.score,a.score,d.label+' corrupt '+probe.subject);assert.equal(c.avg,a.avg,d.label);assert.equal(c.error,a.error,d.label);
     checks++;n++;
   }
   assert.ok(n>0,d.label+' no exclusions exercised');report.push({key:d.key,label:d.label,exclusionChecks:n,status:a.error||a.scoreLabel||'참고 평균'});
 }
 fs.writeFileSync(path.join(__dirname,'../docs/scope-audit-results.json'),JSON.stringify({variants:report.length,exclusionChecks:checks,report},null,2));console.log('  Exclusion mutation cases:',checks);
});
test('prefilter cannot remove an engine-selected row across every curriculum subject and variant',()=>{
 const subjects=[...C.catalog.values()];let checked=0;
 for(const d of C.variants){for(const subject of subjects){
   const special=['체육예술','과탐실','교양P'].includes(subject.kind),probe={...r(subject.subject,special?null:2,4),area:subject.area,kindOverride:subject.kind,ach:subject.kind==='교양P'?'P':'A',score:special?null:90,count:special?null:100};
   let old;try{old=context.SEOUL.run([probe],d.v,d.e.id)}catch(e){continue}
   if(!old.used.length)continue;
   const current=C.calculate([probe],d.key);
   assert.ok(!current.excl.some(x=>x.r.subject===probe.subject&&/^(반영교과 아님|교양\(P\) 미반영|대학 지정 과목 아님|공통과목 미반영|원점수 미기재 과목|성취도만 기재된 과목 미반영|체육·예술 미반영|융합선택 미반영)/.test(x.why)),d.label+' lost '+probe.subject);checked++;
 }}console.log('  Engine-selected membership cases:',checked);
});
test('nine-grade reference comparison preserves range, direction and absent cutoffs',()=>{
 const a=C.gradeComparison(1,1.5);assert.ok(Math.abs(a.mid-1.09)<1e-9);assert.equal(a.lo,1);assert.equal(a.hi,1.18);assert.equal(a.difference,-0.41);assert.equal(a.overlap,false);
 assert.equal(C.gradeComparison(1,1.1).overlap,true);assert.equal(C.gradeComparison(1,1.09).difference,0);assert.equal(C.gradeComparison(1,1).difference,0.09);
 for(const cut of [null,undefined,'',0,10])assert.equal(C.gradeComparison(1,cut).difference,null);
 for(const g of [null,undefined,0,6])assert.equal(C.gradeComparison(g,2),null);
});
console.log(`${tests} checks passed (${C.variants.length} variants)`);
