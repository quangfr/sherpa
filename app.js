/* KEYS & UTILS */
const LS_KEY='SHERPA_STORE_V5';
const TAB_KEY='SHERPA_ACTIVE_TAB';
const nowISO=()=>new Date().toISOString();
const todayStr=()=>new Date().toISOString().slice(0,10);
const uid=()=>crypto.randomUUID?crypto.randomUUID():'id-'+Math.random().toString(36).slice(2);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
const parseDate=s=>s? new Date(s+'T00:00:00'):null;
const daysDiff=(a,b)=>Math.round((a-b)/86400000);
const addDays=(d,n)=>new Date(d.getTime()+n*86400000);
const isMobile=()=>window.innerWidth<=520;
function progBadge(p){ const pct=Math.max(0,Math.min(100,Number(p)||0)); return pct<30?'🟥':(pct<70?'🟨':'🟩'); }
function pctColorClass(p){ const v=Math.max(0,Math.min(100,Number(p)||0)); return v<30?'fill-r':(v<70?'fill-y':'fill-g'); }
const clamp01=(v)=>Math.max(0,Math.min(100,Number(v)||0));
const MONTH_NAMES=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const monthKey=(dateStr)=>dateStr?String(dateStr).slice(0,7):'';
const formatMonthLabel=(key)=>{
  if(!key) return '';
  const [year,month]=key.split('-');
  const idx=Math.max(0,Math.min(11,(Number(month)||1)-1));
  return `${MONTH_NAMES[idx]} ${year}`;
};
const $=id=>document.getElementById(id);
const $$=sel=>document.querySelector(sel);
const $$all=sel=>document.querySelectorAll(sel);
const on=(el,ev,fn,opt)=>el?.addEventListener(ev,fn,opt);
const formatHours=(value)=>{ const num=Number(value); if(!Number.isFinite(num)) return '0'; return num.toString().replace('.',','); };
function autoSizeKeepMax(el, bucket){ if(!el) return; el.style.height='auto'; const h=el.scrollHeight; bucket.value=Math.max(bucket.value||0,h); el.style.height=bucket.value+'px'; }
let ACT_DESC_MAX={value:120}, CONS_DESC_MAX={value:120};
/* DEFAULT STORE */
const DEFAULT_PARAMS={delai_alerte_jours:7,fin_mission_sous_jours:60,stb_recent_jours:30,avis_manquant_depuis_jours:60,objectif_recent_jours:15,objectif_bar_max_heures:10};
let store=load();
/* LOAD / SAVE */
function load(){
const raw=localStorage.getItem(LS_KEY);
if(raw){ try{ return JSON.parse(raw);}catch{ console.warn('LocalStorage invalide, on repart vide.'); } }
const empty={consultants:[],activities:[],objectifs:[],params:{...DEFAULT_PARAMS},meta:{version:5.01,updated_at:nowISO()}};
localStorage.setItem(LS_KEY, JSON.stringify(empty));
return empty;
}
function save(){ store.meta=store.meta||{}; store.meta.updated_at=nowISO(); localStorage.setItem(LS_KEY,JSON.stringify(store)); refreshAll(); }
/* NAV TABS */
const TABS=[
{id:'dashboard',labelFull:'🏠 Dashboard',labelShort:'🏠 Das.'},
{id:'activite',labelFull:'🗂️ Activités',labelShort:'🗂️ Act.'},
{id:'objectif',labelFull:'🎯 Objectifs',labelShort:'🎯 Obj.'},
{id:'reglages',labelFull:'⚙️ Paramètres',labelShort:'⚙️ Par.'}
];
const tabsEl=$('tabs');
TABS.forEach(t=>{
const b=document.createElement('button');
b.className='tab';
b.textContent=t.labelFull;
b.onclick=()=>openTab(t.id,true);
b.id='tab-'+t.id;
b.dataset.full=t.labelFull;
b.dataset.short=t.labelShort;
tabsEl.appendChild(b);
});
function applyTabLabels(){ const compact = window.innerWidth<=520; $$all('.tab').forEach(btn=>{ btn.textContent = compact ? btn.dataset.short : btn.dataset.full; }); }
on(window,'resize',applyTabLabels); applyTabLabels();
function openTab(id, persist=false){
$$all('.tab').forEach(el=>el.classList.remove('active'));
const tabBtn=$$('#tab-'+id); if(tabBtn) tabBtn.classList.add('active');
$$all('.view').forEach(v=>v.classList.remove('active'));
const view=$$('#view-'+id); if(view) view.classList.add('active');
if(persist) localStorage.setItem(TAB_KEY,id);
if(id==='reglages') updateSyncPreview();
}
openTab(localStorage.getItem(TAB_KEY)||'activite');
/* DASHBOARD (inchangé) */
function dashboard(){
const p=store.params||DEFAULT_PARAMS, today=new Date();
const hasRecent=(cid,type,days)=>store.activities.some(a=>a.consultant_id===cid && a.type===type && parseDate(a.date_publication)>=addDays(today,-days));
const alerteCut=addDays(today,-p.delai_alerte_jours);
const alerteList = store.consultants.filter(c => store.activities.some(a=>a.consultant_id===c.id && a.type==='ALERTE' && parseDate(a.date_publication)>=alerteCut));
const finList = store.consultants.filter(c=> c.date_fin && ((d=>d>=0 && d<=p.fin_mission_sous_jours)(daysDiff(parseDate(c.date_fin),today))));
const stbList = store.consultants.filter(c=>!hasRecent(c.id,'ACTION_ST_BERNARD',p.stb_recent_jours));
const avisList = store.consultants.filter(c=>!hasRecent(c.id,'AVIS',p.avis_manquant_depuis_jours));
$('db-fin-w').textContent=p.delai_alerte_jours;
$('db-fin-x').textContent=p.fin_mission_sous_jours;
$('db-stb-y').textContent=p.stb_recent_jours;
$('db-avis-z').textContent=p.avis_manquant_depuis_jours;
const fmt=(arr,box,title)=>{
const out=$(box); out.innerHTML='';
arr.forEach(c=>{
const d=document.createElement('div');
d.className='row';
d.innerHTML = `<span class="dot ${statusOf(c)}" title="état"></span><span class="linklike">${esc(c.nom)}</span><span class="sub">/ ${esc(c.titre_mission||'—')}</span>`;
d.querySelector('.linklike').onclick=()=>{ openTab('activite',true); setConsultantFilter(c.id); };
out.appendChild(d);
});
$(title).textContent=arr.length;
};
fmt(alerteList,'db-alerte-list','db-alerte-title');
fmt(finList,'db-fin-list','db-fin-title');
fmt(stbList,'db-stb-list','db-stb-title');
fmt(avisList,'db-avis-list','db-avis-title');
}
/* STATE */
let state={filters:{consultant_id:'',type:'',month:'',objectif_id:''},objectifs_consultant_id:''};
/* CONSULTANTS */
function statusOf(c){
const p=store.params||DEFAULT_PARAMS, today=new Date();
const hasSTBRecent = store.activities.some(a=>a.consultant_id===c.id && a.type==='ACTION_ST_BERNARD' && parseDate(a.date_publication)>=addDays(today,-p.stb_recent_jours));
const hasAvisRecent = store.activities.some(a=>a.consultant_id===c.id && a.type==='AVIS' && parseDate(a.date_publication)>=addDays(today,-p.avis_manquant_depuis_jours));
const hasAlerteRecent = store.activities.some(a=>a.consultant_id===c.id && a.type==='ALERTE' && parseDate(a.date_publication)>=addDays(today,-p.delai_alerte_jours));
const past = c.date_fin? (daysDiff(parseDate(c.date_fin),today)<0):false;
if(past || hasAlerteRecent) return 'r';
return (hasSTBRecent || hasAvisRecent) ? 'g' : 'y';
}
const selectConsultant=$('filter-consultant');
function renderConsultantOptions(){
  if(!selectConsultant) return;
  const current=state.filters.consultant_id||'';
  const options=['<option value="">👤Tous</option>',
    ...[...store.consultants]
      .sort((a,b)=>(a.nom||'').localeCompare(b.nom||''))
      .map(c=>`<option value="${esc(c.id)}">${esc(c.nom)}</option>`)
  ];
  selectConsultant.innerHTML=options.join('');
  if([...selectConsultant.options].some(o=>o.value===current)){
    selectConsultant.value=current;
  }else{
    selectConsultant.value='';
    if(current) state.filters.consultant_id='';
  }
}
function setConsultantFilter(cid){
  state.filters.consultant_id=cid;
  if(selectConsultant) selectConsultant.value=cid||'';
  renderActivities();
}
function gotoConsultantObjectives(cid){
state.objectifs_consultant_id=cid;
$('filter-objectif-consultant').value=cid;
openTab('objectif',true); renderObjectifs();
}
/* ACTIVITIES */
const actTBody=$$('#activities-table tbody');
const selectType=$('filter-type');
const selectMonth=$('filter-month');
const selectObjectif=$('filter-objectif');
const badgeCount=$('activities-count');
const expandedMobileActivities=new Set();
let monthOptionsCache='';
function updateFilterHighlights(){
  selectConsultant?.classList.toggle('active',!!state.filters.consultant_id);
  selectType?.classList.toggle('active',!!state.filters.type);
  selectObjectif?.classList.toggle('active',!!state.filters.objectif_id);
  selectMonth?.classList.toggle('active',!!state.filters.month);
}
function refreshMonthOptions(){
  if(!selectMonth) return;
  const months=[...new Set(
    store.activities
      .map(a=>monthKey(a.date_publication||''))
      .filter(Boolean)
  )].sort((a,b)=>b.localeCompare(a));
  const options=['<option value="">📅Tous</option>',...months.map(m=>`<option value="${m}">${formatMonthLabel(m)}</option>`)];
  const html=options.join('');
  if(html!==monthOptionsCache){
    selectMonth.innerHTML=html;
    monthOptionsCache=html;
  }
  if(months.includes(state.filters.month)){
    selectMonth.value=state.filters.month;
  }else{
    selectMonth.value='';
    if(state.filters.month) state.filters.month='';
  }
}
on(selectType,'change',e=>{state.filters.type=e.target.value; renderActivities();});
on(selectMonth,'change',e=>{state.filters.month=e.target.value; renderActivities();});
on(selectObjectif,'change',e=>{state.filters.objectif_id=e.target.value; renderActivities();});
$('btn-reset-filters').onclick=()=>{
  state.filters={consultant_id:'',type:'',month:'',objectif_id:''};
  if(selectConsultant) selectConsultant.value='';
  if(selectType) selectType.value='';
  if(selectMonth) selectMonth.value='';
  if(selectObjectif) selectObjectif.value='';
  renderActivities();
};
on(selectConsultant,'change',e=>{ state.filters.consultant_id=e.target.value; renderActivities(); });
const TYPE_META={
ACTION_ST_BERNARD:{emoji:'🐕‍🦺', pill:'stb', label:'Action STB'},
NOTE:{emoji:'📝', pill:'note', label:'Note'},
VERBATIM:{emoji:'💬', pill:'verb', label:'Verbatim'},
AVIS:{emoji:'🗣️', pill:'avis', label:'Avis'},
ALERTE:{emoji:'🚨', pill:'alerte', label:'Alerte'}
};
function renderActivities(){
refreshMonthOptions();
const {consultant_id,type,month,objectif_id}=state.filters;
const list= store.activities
.filter(a=>!consultant_id || a.consultant_id===consultant_id)
.filter(a=>!type || a.type===type)
.filter(a=>!objectif_id || (a.objectif_id||'')===objectif_id)
.filter(a=>!month || monthKey(a.date_publication||'')===month)
.sort((a,b)=>b.date_publication.localeCompare(a.date_publication));
badgeCount.textContent=list.length;
actTBody.innerHTML='';
const mobile = isMobile();
list.forEach(a=>{
const c=store.consultants.find(x=>x.id===a.consultant_id);
const o=a.objectif_id ? store.objectifs.find(x=>x.id===a.objectif_id):null;
const meta=TYPE_META[a.type]||{emoji:'❓',pill:'',label:a.type};
const heuresBadge = a.type==='ACTION_ST_BERNARD' ? `<span class="hours-badge"><b>${esc(formatHours(a.heures??0))}h</b></span>`:'';
const descText=a.description||'';
const descHtml=esc(descText);
const isExpanded=expandedMobileActivities.has(a.id);
const objectiveHtml=o?`🎯 <b>${esc(o.titre)}</b>`:'';
const segments=[];
const headerSegment=heuresBadge || objectiveHtml ? `${[heuresBadge,objectiveHtml].filter(Boolean).join(' ')}` : '';
if(headerSegment || !descText) segments.push(headerSegment || '—');
if(descText) segments.push(descHtml);
const descContent=segments.join(' — ');
const hasMobileContent=descContent.trim().length>0;
const tr=document.createElement('tr'); tr.classList.add('clickable');
tr.innerHTML = mobile
? `
<td class="mobile-only">
<div class="row" style="gap:8px">
<span class="pill ${meta.pill}">${meta.emoji} ${meta.label}</span>
<span class="linklike" data-cpop="${c?.id||''}"><b>${esc(c?.nom||'—')}</b></span>
<span class="sub">· ${esc(a.date_publication||'')}</span>
</div>
<div class="mobile-desc${isExpanded?' expanded':''}" data-act="${a.id}">
<div class="text clamp-8">${descContent}</div>
${hasMobileContent?`<button type="button" class="toggle-more" data-expand="${a.id}">${isExpanded?'Réduire':'Tout afficher'}</button>`:''}
</div>
</td>`
: `
<td class="desktop-only">
<div><span class="pill ${meta.pill} type-pill">${meta.emoji} ${meta.label}</span></div>
<div class="sub">${esc(a.date_publication||'')}</div>
</td>
<td class="desktop-only">
<span class="linklike" data-cpop="${c?.id||''}"><b>${esc(c?.nom||'—')}</b></span>
<div class="sub">${esc(c?.titre_mission||'—')}</div>
</td>
<td class="main desktop-only">
<div class="clamp-1 objective-line" title="${o?esc(o.titre):''}">${headerSegment || '—'}</div>
<div class="clamp-3" title="${descHtml}">${descHtml}</div>
</td>
<td class="desktop-only nowrap actions-cell"><button class="btn small" data-edit="${a.id}" title="Éditer">✏️</button><button class="btn small danger" data-del="${a.id}" title="Supprimer">🗑️</button></td>`;
on(tr,'click',(e)=>{ if(e.target.closest('button,[data-cpop]')) return; openActivityModal(a.id); });
tr.querySelectorAll('[data-cpop]').forEach(el=>on(el,'click',(e)=>{ e.stopPropagation(); const cid=e.currentTarget.dataset.cpop; if(cid) openConsultantModal(cid); }));
if(!mobile){
on(tr.querySelector('[data-edit]'),'click',(e)=>{ e.stopPropagation(); openActivityModal(a.id); });
on(tr.querySelector('[data-del]'),'click',(e)=>{ e.stopPropagation(); if(confirm('Supprimer cette activité ?')){ store.activities=store.activities.filter(x=>x.id!==a.id); save(); } });
}else{
const descWrap=tr.querySelector('.mobile-desc');
const toggleBtn=descWrap?.querySelector('[data-expand]');
const textEl=descWrap?.querySelector('.text');
if(toggleBtn && textEl){
const wasExpanded=descWrap.classList.contains('expanded');
if(wasExpanded) descWrap.classList.remove('expanded');
const collapsedHeight=textEl.clientHeight;
textEl.classList.remove('clamp-8');
const fullHeight=textEl.scrollHeight;
textEl.classList.add('clamp-8');
if(wasExpanded) descWrap.classList.add('expanded');
const needsToggle=fullHeight>collapsedHeight+1;
if(!needsToggle){
toggleBtn.remove();
expandedMobileActivities.delete(a.id);
descWrap.classList.remove('expanded');
}else{
on(toggleBtn,'click',(e)=>{
e.stopPropagation();
const targetId=e.currentTarget.dataset.expand;
if(expandedMobileActivities.has(targetId)){
expandedMobileActivities.delete(targetId);
}else{
expandedMobileActivities.add(targetId);
}
renderActivities();
});
}
}
}
actTBody.appendChild(tr);
});
updateFilterHighlights();
}
on(window,'resize',()=>renderActivities());
/* OBJECTIFS GRID */
const selectObjConsult=$('filter-objectif-consultant');
on(selectObjConsult,'change',e=>{ state.objectifs_consultant_id=e.target.value; renderObjectifs(); });
$('btn-reset-objectif-filters').onclick=()=>{ state.objectifs_consultant_id=''; $('filter-objectif-consultant').value=''; renderObjectifs(); };
function hoursForObjective(objId, byConsultantId=null, recentDays=null){
const acts=store.activities.filter(a=>a.type==='ACTION_ST_BERNARD' && a.objectif_id===objId);
const now=new Date();
return acts.filter(a=>{
if(byConsultantId && a.consultant_id!==byConsultantId) return false;
if(recentDays!=null && parseDate(a.date_publication) < addDays(now,-recentDays)) return false;
return true;
}).reduce((s,a)=>s+(Number(a.heures)||0),0);
}
function consultantsWithSTBForObjective(objId){
const ids=new Set(store.activities.filter(a=>a.type==='ACTION_ST_BERNARD' && a.objectif_id===objId).map(a=>a.consultant_id));
return [...ids];
}
function renderObjectifs(){
const keep=selectObjConsult.value;
selectObjConsult.innerHTML = '<option value="">👤 Tous les consultants</option>' + store.consultants.map(c=>`<option value="${c.id}">${esc(c.nom)}</option>`).join('');
if(keep) selectObjConsult.value=keep;
const grid=$('objectifs-grid'); grid.innerHTML='';
const p=store.params||DEFAULT_PARAMS; const onlyCid=state.objectifs_consultant_id; const barMax = Number(p.objectif_bar_max_heures||10);
store.objectifs.forEach(o=>{
if(onlyCid && !consultantsWithSTBForObjective(o.id).includes(onlyCid)) return;
const total=hoursForObjective(o.id,null,null);
const recent=hoursForObjective(o.id,null,p.objectif_recent_jours);
const stbIds = consultantsWithSTBForObjective(o.id);
const rowsAll = stbIds.map(cid=>{
const c = store.consultants.find(x=>x.id===cid);
const link = (o.consultants||[]).find(x=>x.consultant_id===cid);
const pct = clamp01(link?.progression_pct ?? 0);
const t = hoursForObjective(o.id,c?.id,null);
const r = hoursForObjective(o.id,c?.id,p.objectif_recent_jours);
return {c,pct,t,r};
}).sort((a,b)=> b.pct - a.pct || a.c.nom.localeCompare(b.c.nom));
let rows = rowsAll;
if(onlyCid){
const sel = rowsAll.find(x=>x.c?.id===onlyCid);
const others = rowsAll.filter(x=>x.c?.id!==onlyCid);
rows = sel ? [sel, ...others.slice(0,2)] : others.slice(0,3);
}
const card=document.createElement('div'); card.className='card';
const consList = rows.map(row=>{
const isSel = row.c?.id===onlyCid && Boolean(onlyCid);
const widthPct = Math.max(0, Math.min(100, barMax>0 ? (row.t/barMax)*100 : 0));
const fillClass = pctColorClass(row.pct);
return `
<div class="rowline" title="${row.t}h / ${barMax}h">
<div class="fill ${fillClass}" style="width:${widthPct}%;"></div>
<div class="row space content">
<div><span class="nowrap" title="${row.pct}%">${progBadge(row.pct)}</span>
<span class="linklike ${isSel?'bold':''}" data-goto-c="${row.c?.id||''}" data-goto-o="${o.id}" style="margin-left:6px">${esc(row.c?.nom||'—')}</span>
<span class="sub">(${row.pct}%)</span></div>
<div class="nowrap"><b>${row.t}h</b>${row.r>0 ? ` <span class="green">(+${row.r}h)</span>` : ``}</div>
</div>
</div>`;
}).join('');
card.innerHTML=`
<div class="row space">
<div class="title linklike" data-goto-oid="${o.id}" title="Voir les activités liées">${esc(o.titre)} <span class="sub">(${stbIds.length})</span></div>
<button class="btn small" data-edit="${o.id}">✏️</button>
</div>
<div class="sub" style="margin:4px 0 8px">${esc(o.description||'—')}</div>
<div class="sub" style="margin-bottom:6px">Total objectif : <b>${total}h</b> ${recent>0 ? `<span class="green">(+${recent}h)</span>`:''}</div>
<div class="cons-list cons-mini">${consList || '<span class="muted">Aucun consultant avec 🐕‍🦺 Action STB pour cet objectif</span>'}</div>`;
on(card.querySelector('[data-goto-oid]'),'click',e=>{
const oid=e.currentTarget.dataset.gotoOid;
openTab('activite',true);
state.filters.objectif_id=oid;
const sel=$('filter-objectif');
if(sel) sel.value=oid;
renderActivities();
});
card.querySelectorAll('[data-goto-c]').forEach(a=>on(a,'click',()=>{
const cid=a.dataset.gotoC, oid=a.dataset.gotoO;
openTab('activite',true);
state.filters.consultant_id=cid;
state.filters.objectif_id=oid;
const sel=$('filter-objectif');
if(sel){ sel.value=oid; }
renderActivities();
}));
card.querySelector('[data-edit]').onclick=()=>openObjectifModal(o.id);
grid.appendChild(card);
});
}
/* PARAMS */
function renderParams(){
const p=store.params||DEFAULT_PARAMS;
$('p-delai_alerte').value=p.delai_alerte_jours;
$('p-fin_mission_sous').value=p.fin_mission_sous_jours;
$('p-stb_recent').value=p.stb_recent_jours;
$('p-avis_manquant').value=p.avis_manquant_depuis_jours;
$('p-objectif_recent').value=p.objectif_recent_jours;
$('p-objectif_bar_max').value=p.objectif_bar_max_heures ?? 10;
}
$('btn-save-params').onclick=()=>{
const p=store.params||(store.params={...DEFAULT_PARAMS});
p.delai_alerte_jours=Number($('p-delai_alerte').value||7);
p.fin_mission_sous_jours=Number($('p-fin_mission_sous').value||60);
p.stb_recent_jours=Number($('p-stb_recent').value||30);
p.avis_manquant_depuis_jours=Number($('p-avis_manquant').value||60);
p.objectif_recent_jours=Number($('p-objectif_recent').value||15);
p.objectif_bar_max_heures=Math.max(1, Number($('p-objectif_bar_max').value||10));
save(); alert('Paramètres enregistrés.');
};
/* MODALS (ACTIVITÉ) */
const dlgA=$('dlg-activity');
const faType=$('fa-type');
const faHeuresWrap=$('fa-heures-wrap');
const faHeures=$('fa-heures');
const faConsult=$('fa-consultant');
const faObj=$('fa-objectif');
const faDesc=$('fa-desc');
const btnFaGoto=$('fa-goto-consultant');
const btnFaDelete=$$('#dlg-activity .actions [data-action="delete"]');
faType.onchange=()=>{const isSTB=faType.value==='ACTION_ST_BERNARD'; faHeuresWrap.classList.toggle('hidden',!isSTB); if(isSTB && !faHeures.value) faHeures.value=1; updateFaObjOptions();};
faConsult.onchange=updateFaObjOptions;
btnFaGoto.onclick=()=>{ const cid=faConsult.value; if(cid){ dlgA.close(); openConsultantModal(cid); } };
function updateFaObjOptions(){
const selected=faObj.value;
faObj.innerHTML='<option value="">(aucun)</option>'+store.objectifs.map(o=>`<option value="${o.id}">${esc(o.titre)}</option>`).join('');
if([...faObj.options].some(o=>o.value===selected)) faObj.value=selected;
}
$('btn-new-activity').onclick=()=>openActivityModal();
let currentActivityId=null;
function openActivityModal(id=null){
currentActivityId=id;
faConsult.innerHTML=store.consultants.map(c=>`<option value="${c.id}">${esc(c.nom)}</option>`).join('');
$('fa-date').value=todayStr();
faDesc.value='';
faType.value='ACTION_ST_BERNARD'; faHeuresWrap.classList.remove('hidden'); faHeures.value=1;
faObj.innerHTML='<option value="">(aucun)</option>';
if(id){
const a=store.activities.find(x=>x.id===id); if(!a) return;
faConsult.value=a.consultant_id; faType.value=a.type; $('fa-date').value=a.date_publication||''; faDesc.value=a.description||''; faHeures.value=a.heures||1; updateFaObjOptions(); faObj.value=a.objectif_id||''; faType.onchange();
}else{ updateFaObjOptions(); }
autoSizeKeepMax(faDesc, ACT_DESC_MAX);
on(faDesc,'input',()=>autoSizeKeepMax(faDesc, ACT_DESC_MAX),{once:false});
dlgA.showModal();
}
$('form-activity').onsubmit=(e)=>{
e.preventDefault();
const data={ consultant_id:faConsult.value, type:faType.value, date_publication:$('fa-date').value, description:faDesc.value.trim(), heures: faType.value==='ACTION_ST_BERNARD' ? Number(faHeures.value||1): undefined, objectif_id: faObj.value || undefined };
const missing = !data.consultant_id || !data.type || !data.date_publication || !data.description || (data.type==='ACTION_ST_BERNARD' && !(data.heures>0));
if(!currentActivityId && missing){ dlgA.close('cancel'); return; }
if(missing){ alert('Champs requis manquants.'); return; }
if(currentActivityId){ Object.assign(store.activities.find(x=>x.id===currentActivityId),data,{updated_at:nowISO()}); }else{ store.activities.push({id:uid(),...data,created_at:nowISO(),updated_at:nowISO()}); }
dlgA.close('ok'); save();
};
btnFaDelete?.addEventListener('click',e=>{
 e.preventDefault();
 if(!currentActivityId){ dlgA.close('cancel'); return; }
 if(confirm('Supprimer cette activité ?')){
  store.activities=store.activities.filter(x=>x.id!==currentActivityId);
  currentActivityId=null;
  dlgA.close('del');
  save();
 }
});
/* MODALS (OBJECTIF) */
const dlgO=$('dlg-objectif'); let currentObjectifId=null;
const foDesc=$('fo-desc');
function openObjectifModal(id=null){
currentObjectifId=id;
const o=id? store.objectifs.find(x=>x.id===id) : {id:uid(),titre:'',description:'',consultants:[],created_at:nowISO(),updated_at:nowISO()};
$('fo-titre').value=o.titre||'';
foDesc.value=o.description||'';
autoSizeKeepMax(foDesc, {value:foDesc.scrollHeight});
on(foDesc,'input',()=>autoSizeKeepMax(foDesc,{value:foDesc.scrollHeight}),{once:false});
const pane=$('fo-consultants');
pane.innerHTML='';
const stbIds = consultantsWithSTBForObjective(o.id);
if(stbIds.length===0){
pane.innerHTML = `<div class="sub">Aucun consultant n'a encore de 🐕‍🦺 Action STB liée à cet objectif.</div>`;
}else{
const rows = stbIds.map(cid=>{
const c=store.consultants.find(x=>x.id===cid);
const link=(o.consultants||[]).find(x=>x.consultant_id===cid);
const pct=clamp01(link?.progression_pct ?? 0);
return {c,pct};
}).sort((a,b)=> b.pct - a.pct || a.c.nom.localeCompare(b.c.nom));
rows.forEach(({c,pct})=>{
const color = pct<30?'var(--red)':(pct<70?'var(--yellow)':'var(--green)');
const row=document.createElement('div');
row.className='row space';
row.style.margin='6px 0';
row.innerHTML=`
<div>${esc(c.nom)}</div>
<label class="row" style="gap:6px">Progression
<input type="number" min="0" max="100" step="1" value="${pct}" data-pct="${c.id}" style="width:80px;color:${color};font-weight:700"/>
<span class="sub">%</span>
</label>`;
pane.appendChild(row);
});
on(pane,'input',(e)=>{
const el=e.target.closest('input[type="number"][data-pct]'); if(!el) return;
const v=clamp01(el.value); el.value=v; el.style.color = v<30?'var(--red)':(v<70?'var(--yellow)':'var(--green)'); el.style.fontWeight='700';
}, {once:false});
}
dlgO.showModal();
}
$('btn-new-objectif').onclick=()=>openObjectifModal();
$('form-objectif').onsubmit=(e)=>{
e.preventDefault();
const titre=$('fo-titre').value.trim();
if(!currentObjectifId && !titre){ dlgO.close('cancel'); return; }
if(!titre){ alert('Titre requis.'); return; }
const description=foDesc.value.trim()||undefined;
const entries=[...$$all('#fo-consultants input[data-pct]')].map(el=>({consultant_id:el.dataset.pct, progression_pct:clamp01(el.value)}));
const payload={titre,description,consultants:entries,updated_at:nowISO()};
if(currentObjectifId){ Object.assign(store.objectifs.find(x=>x.id===currentObjectifId),payload); }
else{ store.objectifs.push({id:uid(),...payload,created_at:nowISO()}); }
dlgO.close('ok'); save();
};
$$('#dlg-objectif .actions [value="del"]').onclick=(e)=>{ e.preventDefault(); if(!currentObjectifId){ dlgO.close(); return; } if(confirm('Supprimer cet objectif ?')){ store.objectifs=store.objectifs.filter(o=>o.id!==currentObjectifId); dlgO.close('del'); save(); } };
/* MODALS (CONSULTANT) */
const dlgC=$('dlg-consultant');
let currentConsultantId=null;
const fcDesc=$('fc-desc');
const btnFcGoto=$('fc-goto-objectifs');
function openConsultantModal(id=null){
currentConsultantId=id;
const c=id? store.consultants.find(x=>x.id===id) : {nom:'',titre_mission:'',date_fin:'',url:'',description:''};
$('fc-nom').value=c?.nom||''; $('fc-titre').value=c?.titre_mission||''; $('fc-fin').value=c?.date_fin||''; $('fc-url').value=c?.url||''; fcDesc.value=c?.description||'';
autoSizeKeepMax(fcDesc, CONS_DESC_MAX);
on(fcDesc,'input',()=>autoSizeKeepMax(fcDesc, CONS_DESC_MAX),{once:false});
dlgC.showModal();
}
btnFcGoto.onclick=()=>{ if(currentConsultantId){ dlgC.close(); gotoConsultantObjectives(currentConsultantId); } };
$('btn-new-consultant').onclick=()=>openConsultantModal();
$('form-consultant').onsubmit=(e)=>{
e.preventDefault();
const data={ nom:$('fc-nom').value.trim(), titre_mission:$('fc-titre').value.trim()||undefined, date_fin:$('fc-fin').value||undefined, url:$('fc-url').value||undefined, description:fcDesc.value.trim()||undefined };
if(!currentConsultantId && !data.nom){ dlgC.close('cancel'); return; }
if(!data.nom){ alert('Nom requis.'); return; }
if(currentConsultantId){ Object.assign(store.consultants.find(x=>x.id===currentConsultantId),data,{updated_at:nowISO()}); }
else{ store.consultants.push({id:uid(),...data,created_at:nowISO(),updated_at:nowISO()}); }
dlgC.close('ok'); save();
};
$$('#dlg-consultant .actions [value="del"]').onclick=(e)=>{ e.preventDefault(); if(!currentConsultantId){ dlgC.close(); return; } if(confirm('Supprimer ce consultant (et garder ses activités) ?')){ store.consultants=store.consultants.filter(c=>c.id!==currentConsultantId); dlgC.close('del'); save(); } };
/* SYNC */
function updateSyncPreview(){ const el=$('json-preview'); if(el) el.textContent=JSON.stringify(store,null,2); }
$('btn-copy-json').onclick=async()=>{ await navigator.clipboard.writeText(JSON.stringify(store,null,2)); alert('JSON copié ✅'); };
const fileInput=$('file-import');
$('btn-reset-storage').onclick=resetFromDataJson;
async function resetFromDataJson(){
try{
const base=new URL('.', location.href);
const url=new URL('data.json', base).href;
const resp=await fetch(url, {cache:'no-store'});
if(!resp.ok) throw new Error('HTTP '+resp.status);
const data=await resp.json();
applyIncomingStore(data, 'data.json');
}catch(err){
console.warn('Échec fetch data.json → fallback file picker:', err);
alert("Impossible de charger 'data.json' depuis le répertoire courant.\nSélectionnez un fichier JSON local.");
fileInput.value=''; fileInput.click();
}
}
on(fileInput,'change', async (e)=>{
const f=e.target.files?.[0]; if(!f) return;
try{ const text=await f.text(); const data=JSON.parse(text); applyIncomingStore(data, f.name); }
catch(err){ console.error('Import JSON invalide:', err); alert('Fichier JSON invalide ❌'); }
});
function applyIncomingStore(incoming, sourceLabel){
if(!incoming || typeof incoming!=='object') throw new Error('Format vide');
const required=['consultants','activities','objectifs','params'];
for(const k of required){ if(!(k in incoming)) throw new Error('Champ manquant: '+k); }
incoming.params = Object.assign({...DEFAULT_PARAMS}, incoming.params||{});
incoming.meta = Object.assign({version:store?.meta?.version??5.01}, incoming.meta||{});
incoming.meta.updated_at = nowISO();
localStorage.setItem(LS_KEY, JSON.stringify(incoming)); store = incoming; refreshAll();
alert(`LocalStorage réinitialisé depuis « ${sourceLabel} » ✅`);
}
/* INIT & RENDER */
function renderActivityFiltersOptions(){
const curr = selectObjectif.value;
selectObjectif.innerHTML = '<option value="">🎯Tous</option>' + store.objectifs.map(o=>`<option value="${o.id}">${esc(o.titre)}</option>`).join('');
if([...selectObjectif.options].some(o=>o.value===curr)) selectObjectif.value=curr;
updateFilterHighlights();
}
function refreshAll(){ renderConsultantOptions(); renderActivityFiltersOptions(); renderActivities(); renderObjectifs(); renderParams(); dashboard(); updateSyncPreview(); }
/* Auto-bootstrap si vide */
(function autoBootstrapIfEmpty(){
const hadData = (()=>{ try{ const obj=JSON.parse(localStorage.getItem(LS_KEY)||'null'); return obj && (obj.consultants||[]).length + (obj.activities||[]).length + (obj.objectifs||[]).length > 0; }catch{return false;} })();
if(!hadData){ resetFromDataJson(); }
})();
/* Premier rendu */
refreshAll();
