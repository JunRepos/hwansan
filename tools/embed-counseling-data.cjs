// Refresh the new standalone HTML with the repository's current public rules.
// The original index.html is read only. No student data is embedded.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const conversion = scripts.find(s => s.includes('window.CONV9 ='));
let engine = scripts.find(s => s.includes('window.SEOUL ='));
if (!conversion || !engine) throw Error('Source rule blocks missing');
engine = engine.replace('    return {src:r,', '    if(r.kindOverride) kind = r.kindOverride;\n    return {src:r,');
// Missing groups must never become grade zero.
engine = engine.replace('    c.extra.교과가중평균등급 = s / tw;', '    c.extra.교과가중평균등급 = Object.keys(wts).every(function(k){return !!by[k];}) ? s / tw : null;');
const start = engine.indexOf('  function kookmin(areas){');
const end = engine.indexOf('  function soongsil(', start);
if(start < 0 || end < 0) throw Error('Kookmin function boundaries missing');
engine = engine.slice(0,start) + `  function kookmin(areas){
    return function(c){
      var table=G5(100,97,90,70,0);
      c.rows.forEach(function(r){
        if(!areaOk(r,areas)){c.skip(r,'반영교과 아님('+areas.join('·')+')');return;}
        if(!has(['공통','일반','진로'],r.kind)){c.skip(r,'공통·일반·진로만 반영');return;}
        if(!r.rank){c.skip(r,'석차등급 없음');return;}
        c.use(r,r.rank,r.kind+' 석차등급',table[r.rank]);
      });
      var core=c.used.filter(function(u){return u.r.kind!=='진로';});
      var career=c.used.filter(function(u){return u.r.kind==='진로';});
      var a=wavg(core,'pt'),b=wavg(career,'pt');
      if(a==null){c.score=null;c.notes.push('공통·일반선택 성적이 없어 계산 보류');}
      else c.score=rnd((career.length?a*0.85+b*0.15:a)*10,2);
      c.scoreLabel='교과점수(1,000점 기준 · 그룹별 가중)';
      c.formula=career.length?'(공통·일반 배점평균×0.85 + 진로 배점평균×0.15)×10':'진로 이수 없음: 공통·일반 배점평균×10';
      c.notes.push('계열별 교과 및 공통·일반 85% / 진로 15% 반영. 진로 미이수 시 공통·일반만 집계하는 기존 해석 유지 — 원문 확인 필요.');
    };
  }
` + engine.slice(end);
engine = engine.replace('if(hasJ && !(entryId && JINRO_SAME[entryId]))', "if(hasJ && entryId !== 's-kookmin' && !(entryId && JINRO_SAME[entryId]))");
engine = engine.replace('prep:prep};', 'prep:prep, designatedSubjects:HY_LIST.map(function(s){return s.normalize("NFKC").replace(/\\s+/g,"");})};');
engine = engine.replace('if(!has(HY_LIST, r.subject))', 'if(!HY_LIST.some(function(s){return s.normalize("NFKC").replace(/\\s+/g,"") === r.subject.normalize("NFKC").replace(/\\s+/g,"");}))');
const target = path.join(root,'상담.html');
const html = fs.readFileSync(target,'utf8');
const embedded = '<!-- PUBLIC_DATA_START -->\n<script id="public-conversion">'+conversion+'</script>\n<script id="public-rules">'+engine+'</script>\n<!-- PUBLIC_DATA_END -->';
let output = html.includes('<!-- EMBEDDED_DATA -->') ? html.replace('<!-- EMBEDDED_DATA -->',()=>embedded) : html.replace(/<!-- PUBLIC_DATA_START -->[\s\S]*?<!-- PUBLIC_DATA_END -->/,()=>embedded);
const scope=fs.readFileSync(path.join(__dirname,'counseling-scope.js'),'utf8');
const calculate=fs.readFileSync(path.join(__dirname,'counseling-calculate.js'),'utf8');
const startCalc=output.indexOf('/* CANDIDATE_SCOPE_START */')>=0?output.indexOf('/* CANDIDATE_SCOPE_START */'):output.indexOf('function calculate(raw,key)');
const endCalc=output.indexOf('function conversion(grade)',startCalc);
if(startCalc<0||endCalc<0)throw Error('Calculation block missing');
output=output.slice(0,startCalc)+'/* CANDIDATE_SCOPE_START */\n'+scope+'\n'+calculate+'\n/* CANDIDATE_SCOPE_END */\n '+output.slice(endCalc);
output=output.replace('return {kinds,areas,catalog,identify,num,avg,term,issues,variants,calculate,','return {kinds,areas,catalog,identify,num,avg,term,issues,variants,scopeExclusion,calculate,');
output=output.replace('variants,scopeExclusion,calculate,conversion,','variants,scopeExclusion,calculate,gradeComparison,conversion,');
if(output === html && !html.includes('PUBLIC_DATA_START')) throw Error('Data marker missing');
fs.writeFileSync(target,output);
console.log('Embedded current rules and conversion table into 상담.html');
