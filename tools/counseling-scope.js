// Shared preflight policy for all embedded variants. Candidate includes ranking,
// subject-group selection, bonuses and penalties; it is not just final `used`.
function scopeExclusion(raw,d){
 const p=identify(raw),r=SEOUL.prep({...raw,area:p.area,kindOverride:p.kind}),id=d.e.id,vi=d.vi;
 const unknown=!p.known||p.conflict&&!raw.kindOverride;
 if(!unknown&&r.kind==='교양P')return '교양(P) 미반영';
 const five=['국어','수학','영어','사회','과학'],human=['국어','수학','영어','사회'],science=['국어','수학','영어','과학'];
 let areas=null;
 if(['s-kangseo-il','s-kangseo-gw','s-konkuk','s-catholic','s-duksung','s-dongguk','s-sahmyook','s-swu','s-skhu','s-sookmyung','s-kwangwoon','s-pcts','s-chongshin','s-bible','s-hufs','s-hanyang','s-ewha','s-hansung-jy','s-seokyeong-lang','s-seokyeong-math','s-seokyeong-fu'].includes(id))areas=five;
 if(['s-kookmin','s-myongji-hs','s-myongji-iv','s-hongik'].includes(id))areas=vi===0?human:science;
 if(['s-khu','s-seoultech','s-sejong','s-sungshin'].includes(id))areas=vi===0?human:vi===1?science:five;
 if(id==='s-khu'&&vi===1&&r.hs)areas=null;
 if(id==='s-soongsil')areas=vi===1?science:human;
 if(id==='s-dongduk')areas=vi===1?science:five;
 if(id==='s-hansung-gw')areas=vi===0?human:vi===1?science:five;
 if(id==='s-kyonggi-gw')areas=human;
 if(id==='s-chugye')areas=['국어','수학','영어'];
 if(id==='s-mtheo')areas=['국어','영어','사회','과학'];
 if(['s-cau','s-uos','s-sangmyung'].includes(id))areas=five.concat(['기가정보','제2외한문']);
 if(areas&&r.gyo&&!areas.includes(r.gyo))return '반영교과 아님('+areas.join('·')+')';
 // 과목 사전에 없거나 교과와 맞지 않는 과목: 이 전형의 반영 교과 밖이면 위에서 빠지고, 안이면 교사 확인이 필요합니다.
 if(unknown)return null;
 if(id==='s-hanyoung'&&!SEOUL.designatedSubjects.includes(String(raw.subject).normalize('NFKC').replace(/\s+/g,'')))return '대학 지정 과목 아님';
 if(id==='s-dongguk'&&['공통','과탐실'].includes(r.kind))return '공통과목 미반영';
 if(id==='s-mtheo'){
   if(['과탐실','체육예술'].includes(r.kind))return '원점수 미기재 과목';
   if(Number.isFinite(r.credit)&&r.credit>0&&r.credit<2)return '2학점 미만';
   if(Number.isInteger(r.count)&&r.count>0&&r.count<30)return '수강자수 30명 미만';
 }
 if(id==='s-sungshin'&&r.count===1)return '수강자수 1명 과목';
 if(id==='s-sogang'&&r.kind==='체육예술')return '체육·예술 미반영';
 const fusionExcluded=['s-konkuk','s-duksung','s-kwangwoon','s-sookmyung','s-soongsil','s-kookmin','s-hansung-gw','s-hansung-jy','s-chugye','s-kyonggi-gw'];
 if(r.kind==='융합'&&fusionExcluded.includes(id)&&!(id==='s-hansung-gw'&&vi===2))return '융합선택 미반영';
 const achievementOnly=['s-yonsei','s-snue','s-knsu','s-catholic','s-myongji-hs','s-myongji-iv','s-sogang'];
 // 고려대는 원점수·평균이 적힌 과목(나이스 일반 구역)이면 체육·예술이라도 성취도로 반영합니다.
 if(id==='s-korea'&&raw.sec==='일반'&&raw.score!=null)return null;
 if(['과탐실','체육예술'].includes(r.kind)&&!achievementOnly.includes(id)&&!(id==='s-hansung-gw'&&vi===2))return '성취도만 기재된 과목 미반영';
 return null;
}
