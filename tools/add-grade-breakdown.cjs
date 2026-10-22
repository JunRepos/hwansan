const fs=require('fs'),vm=require('vm');
const target='상담.html';let h=fs.readFileSync(target,'utf8');
if(h.includes('function gradeBreakdown('))throw Error('Already added');
const start=h.indexOf('<section class="panel"><div class="panel-head"><h2>학기별 성적</h2>');
const end=h.indexOf('<details class="panel"><summary>관심 전형',start);
if(start<0||end<0)throw Error('Overview section not found');
h=h.slice(0,start)+'${gradeBreakdown(rs)}'+h.slice(end);
h=h.replace('function overview(){',fs.readFileSync('tools/grade-breakdown-ui.js','utf8')+'\nfunction overview(){');
h=h.replace('function bindView(){',`function bindView(){document.querySelectorAll('[data-score-mode]').forEach(b=>b.onclick=()=>{state.scoreMode=b.dataset.scoreMode;render();document.querySelector('[data-score-mode="'+state.scoreMode+'"]').focus({preventScroll:true});});`);
const css=`
.grade-view-switch{display:flex;gap:4px;background:var(--line);border-radius:8px;padding:4px;margin:22px 0 16px}.grade-view-switch button{flex:1;border:0;background:transparent;color:var(--muted);padding:8px 12px}.grade-view-switch button[aria-pressed=true]{background:var(--paper);color:var(--ink);box-shadow:0 1px 3px #18181b12}.grade-detail-table th:not(:first-child),.grade-detail-table td:not(:first-child){text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.grade-detail-table td:first-child{min-width:125px}.grade-detail-table th:first-child{width:33%}.grade-detail-table td{vertical-align:middle}.achievement{display:inline-block;min-width:22px;text-align:center;padding:1px 5px;border-radius:4px;font-size:11px;font-weight:700;background:var(--bg);color:var(--muted)}.achievement.A{background:#e4f3ed;color:#17634c}.achievement.B{background:#e9eefb;color:#3659a1}.achievement.C{background:#fff2d9;color:#88621f}.achievement-heading{margin:20px 0 8px}.grade-group .help-line{margin:-6px 0 12px}.grade-group .panel-head{flex-wrap:wrap}.grade-group h3{font-size:12px}@media(max-width:480px){.grade-detail-table th,.grade-detail-table td{padding:8px}.grade-detail-table{font-size:11px}.grade-detail-table td strong{font-size:12px}.grade-detail-table td:first-child{min-width:110px}}
`;
h=h.replace('</style>',css+'</style>');
for(const m of h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
fs.writeFileSync(target,h);console.log('Added grouped and semester subject tables');
