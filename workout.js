'use strict';
/* ================= ANTRENMAN ================= */
const AKEY='takviyem_aktif_antrenman';
const imgSrc=(e,i)=>`images/${e.img}_${i}.jpg`;
const fmt=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?`${h}:${pad(m)}:${pad(x)}`:`${pad(m)}:${pad(x)}`;};
const kgf=n=>Number(n).toLocaleString('tr-TR',{maximumFractionDigits:1});
const repTxt=e=>e.type==='hold'?`${e.hold} sn`:(e.reps[0]===e.reps[1]?`${e.reps[0]}`:`${e.reps[0]}–${e.reps[1]}`)+' tekrar'+(e.perSide?' (her taraf)':'');
function estSec(e){
  if(e.type==='cardio'||e.type==='stretch')return e.min*60;
  if(e.type==='hold')return e.sets*e.hold+(e.sets-1)*e.rest+45;
  return e.sets*(e.perSide?90:50)+(e.sets-1)*e.rest+120; // +2 dk: makine ayarı, ısınma seti, geçiş
}
const estMin=e=>Math.max(1,Math.round(estSec(e)/60));
const progMin=p=>Math.round(p.steps.reduce((a,id)=>a+estSec(EXERCISES[id]),0)/60);
function planLine(e){
  if(e.type==='cardio'||e.type==='stretch')return `Bu aşamada: <b>${e.min} dk</b> ${e.type==='cardio'?'ısınma':'esneme'} · ${esc(e.info)}`;
  return `Bu harekette: <b>${e.sets} set × ${repTxt(e)}</b>, setler arası <b>${e.rest} sn</b> dinlenme, tahmini süre <b>~${estMin(e)} dk</b>`;
}
function workouts(){return S.workouts=S.workouts||[];}
function hasWorkout(k){return (S.workouts||[]).some(w=>w.date===k);}
function lastFor(id){
  const ws=workouts();
  for(let i=ws.length-1;i>=0;i--){const st=ws[i].steps.find(s=>s.id===id&&s.sets.some(x=>x.done));if(st)return {date:ws[i].date,sets:st.sets.filter(x=>x.done)};}
  return null;
}
function suggestion(id){
  const e=EXERCISES[id];if(e.type!=='reps')return null;const l=lastFor(id);if(!l)return null;
  const kgs=l.sets.map(s=>+s.kg||0),mx=Math.max(...kgs);
  const allTop=l.sets.length>=e.sets&&l.sets.every(s=>(+s.reps||0)>=e.reps[1]);
  if(allTop&&mx>0)return {kg:mx+e.inc,from:mx,msg:`💡 Geçen sefer tüm setlerde ${e.reps[1]} tekrara ulaştın. Bu sefer <b>+${kgf(e.inc)} kg → ${kgf(mx+e.inc)} kg</b> dene!`};
  return {kg:mx||'',from:mx,msg:null};
}
function defaultProgKey(d=new Date()){
  const dow=d.getDay();const hit=Object.entries(PROGRAM).find(([k,p])=>p.dow===dow);if(hit)return hit[0];
  for(let i=1;i<7;i++){const x=(dow+i)%7;const h=Object.entries(PROGRAM).find(([k,p])=>p.dow===x);if(h)return h[0];}
  return 'altA';
}
let selProg=null,wSeg='program';
function loadActive(){try{return JSON.parse(localStorage.getItem(AKEY));}catch(e){return null;}}
let W=loadActive();
function saveW(){if(W)localStorage.setItem(AKEY,JSON.stringify(W));else localStorage.removeItem(AKEY);}

/* ---------- Ana ekran ---------- */
function renderWorkout(){
  const today=new Date(),dk=defaultProgKey(today),isTrainDay=Object.values(PROGRAM).some(p=>p.dow===today.getDay());
  if(!selProg)selProg=dk;const p=PROGRAM[selProg];
  const doneToday=workouts().filter(w=>w.date===todayKey());
  let h=`<div class="card">
   <div class="muted small">${today.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'})}</div>
   <h2 style="margin:4px 0 0;font-size:22px">${isTrainDay?'Bugün: '+esc(PROGRAM[dk].name):'Bugün dinlenme günü 😴'}</h2>
   ${isTrainDay?'':`<p class="muted small" style="margin:6px 0 0">Sıradaki antrenman: <b>${esc(PROGRAM[dk].name)}</b>. Dinlenmek de gelişmenin parçası — istersen yine de bir gün seçebilirsin.</p>`}
   ${doneToday.length?`<div class="tipbox">✅ Bugün antrenman yaptın: ${doneToday.map(w=>esc(PROGRAM[w.prog]?.name||w.prog)+' · '+fmt(w.durationSec)).join(', ')}</div>`:''}
   <div class="daychips" id="dayChips">${Object.entries(PROGRAM).map(([k,x])=>`<button data-p="${k}" class="${k===selProg?'on':''}">${x.dow!=null?DOW[x.dow]+' · ':'🏋️ '}${esc(x.short)}</button>`).join('')}</div>
   <div class="muted small">${esc(p.name)} · ${p.steps.length} aşama · ~${progMin(p)} dk${p.alt?' · makineler doluysa alternatif':''}</div>
   ${W?`<button class="btn pri full" id="wResume" style="min-height:60px;font-size:18px">▶ Devam et: ${esc(PROGRAM[W.prog].name)} (${fmt((Date.now()-W.start)/1000)})</button>`:
   `<button class="btn pri full" id="wStart" style="min-height:60px;font-size:18px">▶ Antrenmanı başlat</button>`}
  </div>
  <div class="seg" id="wSeg">${[['program','📋','Program'],['lib','📚','Kütüphane'],['prog','📈','İlerleme'],['tips','💡','İpuçları']].map(([k,i,t])=>`<button data-s="${k}" class="${wSeg===k?'on':''}"><span style="display:block;font-size:18px">${i}</span>${t}</button>`).join('')}</div>
  <div id="wBody"></div>`;
  $('v-workout').innerHTML=h;
  $('dayChips').onclick=e=>{const b=e.target.closest('button');if(!b)return;selProg=b.dataset.p;renderWorkout();};
  $('wSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;wSeg=b.dataset.s;renderWorkout();};
  if($('wStart'))$('wStart').onclick=()=>startWorkout(selProg);
  if($('wResume'))$('wResume').onclick=()=>openPlayer();
  const B=$('wBody');
  if(wSeg==='program')B.innerHTML=Object.entries(PROGRAM).map(([k,x])=>`<div class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${x.dow!=null?DOW[x.dow]+' · ':''}${esc(x.name)}</h2><span class="chip">~${progMin(x)} dk</span></div>${x.alt?'<p class="muted small">Makineler doluysa ya da sadece dambıl varsa herhangi bir antrenman günü yerine yapabilirsin.</p>':''}
    <div style="margin-top:8px">${x.steps.map(id=>exRow(id)).join('')}</div></div>`).join('');
  else if(wSeg==='lib'){
    const groups={};for(const [id,e] of Object.entries(EXERCISES)){(groups[e.eq]=groups[e.eq]||[]).push(id);}
    B.innerHTML=`<div class="card"><h2>📚 Hareket Kütüphanesi</h2><p class="muted small" style="margin:0">Her harekete dokun: adım adım resimli anlatım, ipuçları ve sık yapılan hatalar.</p></div>`+
      ['Dambıl','Makine','Kablo','Vücut ağırlığı','Kardiyo'].filter(g=>groups[g]).map(g=>`<div class="card"><h2>${g==='Dambıl'?'🏋️':g==='Makine'?'⚙️':g==='Kablo'?'🔗':g==='Kardiyo'?'🏃':'🧘'} ${g} (${groups[g].length})</h2>${groups[g].map(id=>exRow(id,true)).join('')}</div>`).join('');
  } else if(wSeg==='prog')B.innerHTML=progressHTML();
  else B.innerHTML=tipsHTML();
  B.onclick=e=>{const r=e.target.closest('[data-ex]');if(r)showExercise(r.dataset.ex);};
}
function exRow(id,lib){
  const e=EXERCISES[id],sg=suggestion(id);
  const meta=e.type==='cardio'||e.type==='stretch'?`${e.min} dk`:`${e.sets}×${repTxt(e)} · ${e.rest} sn`;
  return `<div class="exrow" data-ex="${id}"><img src="${imgSrc(e,0)}" alt="" loading="lazy"><div class="nm"><b>${esc(e.name)}<span class="eqtag ${e.eq}">${e.eq}</span></b><span>${lib?esc(e.muscle):meta}${sg&&sg.msg?' · ⬆️ ağırlık artır':''}</span></div><span class="muted">›</span></div>`;
}
function stepsHTML(e){
  return e.steps.map((st,i)=>`<div class="stepimg"><img src="${imgSrc(e,i)}" alt="Adım ${i+1}"><span class="badge">Adım ${i+1} · ${i===0?'Başlangıç':'Hareket'}</span></div><div class="steps"><ol start="${i===0?1:e.steps[0].length+1}">${st.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div>`).join('');
}
function showExercise(id){
  const e=EXERCISES[id],l=lastFor(id),sg=suggestion(id);
  $('sheet').innerHTML=`<h2>${esc(e.name)}</h2><p class="muted" style="margin:0">${esc(e.gym)} · 🎯 ${esc(e.muscle)} <span class="eqtag ${e.eq}">${e.eq}</span></p>
   <div class="plan">${planLine(e)}</div>${stepsHTML(e)}
   ${e.tip?`<div class="tipbox">🏋️ <b>Ağırlık:</b> ${esc(e.tip)}</div>`:''}
   <div class="warn">⚠️ <b>Sık hata:</b> ${esc(e.mistake)}</div>
   ${l?`<p class="last">Son: ${l.date} · ${l.sets.map(s=>e.type==='hold'?s.reps+' sn':`${kgf(+s.kg||0)} kg×${s.reps}`).join(', ')}</p>`:''}${sg&&sg.msg?`<div class="sugg">${sg.msg}</div>`:''}
   <button class="btn pri full" onclick="closeModal()">Tamam</button>`;
  $('modal').classList.add('on');$('sheet').scrollTop=0;
}
function progressHTML(){
  const ws=workouts();
  if(!ws.length)return `<div class="card"><h2>📈 İlerleme</h2><p class="muted">Henüz kayıtlı antrenman yok. İlk antrenmanını bitirince burada ağırlıkların, hacmin ve ağırlık artırma önerileri görünecek.</p></div>`;
  const ids=[...new Set(ws.flatMap(w=>w.steps.map(s=>s.id)))].filter(id=>EXERCISES[id]&&EXERCISES[id].type!=='cardio'&&EXERCISES[id].type!=='stretch');
  const rows=ids.map(id=>{const e=EXERCISES[id],l=lastFor(id);if(!l)return '';const sg=suggestion(id);
    const best=Math.max(...ws.flatMap(w=>w.steps.filter(s=>s.id===id).flatMap(s=>s.sets.filter(x=>x.done).map(x=>+x.kg||0))));
    return `<div class="exrow" data-ex="${id}"><img src="${imgSrc(e,0)}" alt=""><div class="nm"><b>${esc(e.name)}</b><span>Son (${l.date.slice(5).split('-').reverse().join('.')}): ${l.sets.map(s=>e.type==='hold'?s.reps+' sn':`${kgf(+s.kg||0)}×${s.reps}`).join(', ')}${e.type==='reps'?` · en iyi ${kgf(best)} kg`:''}</span>${sg&&sg.msg?`<span style="color:var(--acc);font-weight:800;display:block">⬆️ Sıradaki: ${kgf(sg.kg)} kg</span>`:''}</div></div>`;}).join('');
  const last=ws.slice(-8).reverse().map(w=>`<div class="sumrow"><span>${w.date.split('-').reverse().join('.')} · <b>${esc(PROGRAM[w.prog]?.short||w.prog)}</b></span><span class="muted">${fmt(w.durationSec)} · ${w.setsDone} set · ${kgf(w.volume)} kg</span></div>`).join('');
  return `<div class="card"><h2>📈 Hareket bazında</h2><p class="muted small" style="margin:0 0 6px">Bir hareketin tüm setlerinde üst tekrar sayısına ulaşınca ağırlığı artır (progresif yüklenme).</p>${rows}</div><div class="card"><h2>🗓️ Son antrenmanlar (${ws.length})</h2>${last}</div>`;
}
function tipsHTML(){
  const T=[['🔥','Isınma şart','Her antrenmana 5–10 dk koşu bandıyla başla. İlk harekette, kullanacağın ağırlığın yarısıyla 1 ısınma seti (10 tekrar) yap.'],
   ['🎯','Form > ağırlık','Ağırlığı değil hareketi öğren. Her tekrarda kontrollü in (2–3 sn), kontrollü kalk. Sallanarak kaldırıyorsan ağırlık fazladır.'],
   ['🐢','İlk 2 hafta hafif','İlk 2 hafta her sette 3–4 tekrar daha yapabilecek gibi bitir. Kasların, eklemlerin ve tendonların alışsın; ağır kas ağrısı motivasyonu düşürür.'],
   ['📈','Yavaş ama sürekli artır','Bir hareketin tüm setlerinde üst tekrar sayısına (ör. 12) ulaşınca bir sonraki sefer +2,5 kg ekle (dambılda bir sonraki ağırlık). Uygulama bunu sana önerecek.'],
   ['🌬️','Nefes','Ağırlığı kaldırırken/iterken nefes ver, indirirken nefes al. Nefesini tutma.'],
   ['💧','Su','Antrenman boyunca 500–750 ml su iç. Kreatin kullandığın için gün içinde toplam 2,5–3,5 L hedefle.'],
   ['⏱️','Dinlenme','Büyük hareketlerde (leg press, bench, row) 90 sn, küçük hareketlerde 60 sn dinlen. Uygulama otomatik sayar.'],
   ['🥤','Antrenman sonrası','Antrenmandan sonraki 1–2 saat içinde whey iç ve düzgün bir öğün ye.'],
   ['😴','Toparlanma','Kaslar dinlenirken büyür: 7–9 saat uyu. Aynı kas grubunu üst üste iki gün çalıştırma (program buna göre).'],
   ['🚫','Ağrı ≠ kas yorgunluğu','Eklemde keskin ağrı hissedersen hareketi bırak. Kas yanması normaldir, eklem ağrısı değildir.'],
   ['🙋','Çekinme','Makineyi nasıl ayarlayacağını bilmiyorsan salondaki eğitmene sor — herkes bir yerden başladı.']];
  return `<div class="card"><h2>💡 Yeni başlayanlar için</h2><p class="muted small" style="margin:0">1,90 m · 79 kg · hedef: fit ve kaslı vücut. Haftada 4 gün, 60–75 dk.</p></div>`+T.map(([i,t,d])=>`<div class="card"><h2 style="margin-bottom:6px">${i} ${t}</h2><p style="margin:0;line-height:1.45">${d}</p></div>`).join('');
}

/* ---------- Oynatıcı ---------- */
let audioCtx=null,wakeLock=null,ticker=null,imgFlip=0,imgAuto=true,imgTimer=null,lastBeep=0;
function unlockAudio(){try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();}catch(e){}}
function beep(n=3){
  try{unlockAudio();const t0=audioCtx.currentTime;for(let i=0;i<n;i++){const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=i===n-1?1320:880;o.connect(g);g.connect(audioCtx.destination);g.gain.setValueAtTime(.0001,t0+i*.3);g.gain.exponentialRampToValueAtTime(.4,t0+i*.3+.02);g.gain.exponentialRampToValueAtTime(.0001,t0+i*.3+.22);o.start(t0+i*.3);o.stop(t0+i*.3+.25);}}catch(e){}
  if(navigator.vibrate)navigator.vibrate([300,120,300,120,500]);
}
async function keepAwake(){try{if('wakeLock' in navigator&&!wakeLock&&document.visibilityState==='visible'){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null;});}}catch(e){wakeLock=null;}}
document.addEventListener('visibilitychange',()=>{if(W&&$('player').classList.contains('on')&&!document.hidden){keepAwake();pTick();}});
function newStep(id){
  const e=EXERCISES[id],st={id,enter:null,spent:0,sets:[],cd:null};
  if(e.type==='reps'){
    const l=lastFor(id),sg=suggestion(id);
    for(let i=0;i<e.sets;i++){const ls=l&&l.sets[i]||l&&l.sets[l.sets.length-1];
      st.sets.push({kg:sg&&sg.msg?sg.kg:(ls?ls.kg:''),reps:sg&&sg.msg?e.reps[0]:(ls?ls.reps:e.reps[1]),done:false});}
  }else if(e.type==='hold'){const l=lastFor(id);for(let i=0;i<e.sets;i++)st.sets.push({kg:0,reps:l&&l.sets[i]?l.sets[i].reps:e.hold,done:false});}
  else st.sets.push({kg:0,reps:e.min,done:false});
  return st;
}
function startWorkout(prog){
  unlockAudio();
  W={prog,start:Date.now(),idx:0,steps:PROGRAM[prog].steps.map(newStep),rest:null};
  W.steps[0].enter=Date.now();saveW();
  const l=ensureLog(todayKey());l.training=true;save();
  openPlayer();
}
function openPlayer(){unlockAudio();$('player').classList.add('on');$('pfoot').classList.add('on');document.body.style.overflow='hidden';keepAwake();renderPlayer();clearInterval(ticker);ticker=setInterval(pTick,250);}
function closePlayer(){$('player').classList.remove('on');$('pfoot').classList.remove('on');document.body.style.overflow='';clearInterval(ticker);clearInterval(imgTimer);try{wakeLock&&wakeLock.release();}catch(e){}wakeLock=null;renderWorkout();}
const cur=()=>W.steps[W.idx];
const stepSpent=st=>(st.spent+(st.enter?Date.now()-st.enter:0))/1000;
function gotoStep(i){
  if(i<0||i>=W.steps.length)return;
  const c=cur();if(c.enter){c.spent+=Date.now()-c.enter;c.enter=null;}
  if(c.cd&&c.cd.end){c.cd.left=Math.max(0,(c.cd.end-Date.now())/1000);c.cd.end=null;}
  W.idx=i;W.rest=null;cur().enter=Date.now();saveW();imgFlip=0;renderPlayer();window.scrollTo(0,0);$('player').scrollTop=0;
}
function renderPlayer(){
  if(!W)return;const p=PROGRAM[W.prog],st=cur(),e=EXERCISES[st.id],n=W.steps.length;
  const doneSets=st.sets.filter(s=>s.done).length,curSet=Math.min(doneSets+1,st.sets.length);
  const isTimed=e.type==='cardio'||e.type==='stretch';
  const l=lastFor(st.id),sg=suggestion(st.id);
  const nx=W.steps[W.idx+1]?EXERCISES[W.steps[W.idx+1].id]:null;
  let body='';
  if(isTimed){
    const total=e.min*60,cd=st.cd||{left:total};const left=cd.end?Math.max(0,(cd.end-Date.now())/1000):cd.left;
    body=`<div class="cd"><div class="muted small">Hedef: ${e.min} dk</div><div class="big" id="pCd">${fmt(left)}</div><div class="sub">${esc(e.info)}</div>
     <div class="row" style="justify-content:center"><button class="btn pri" id="cdGo" style="min-width:140px">${cd.end?'⏸ Duraklat':left<total&&left>0?'▶ Devam':left<=0?'✓ Bitti':'▶ Başlat'}</button><button class="btn" id="cdReset">↺</button><button class="btn" id="cdDone">✓ Tamam</button></div></div>`;
  }else if(e.type==='hold'){
    body=`<div class="sets">${st.sets.map((s,i)=>`<div class="s ${s.done?'done':''} ${i===doneSets?'cur':''}"><span class="n">Set ${i+1}</span><input inputmode="numeric" data-i="${i}" data-f="reps" value="${esc(s.reps)}" aria-label="saniye"><span class="muted small">saniye</span><button class="ok" data-ok="${i}">${s.done?'✓':''}</button></div>`).join('')}</div>
     <div class="cd"><div class="muted small">Set ${curSet}/${st.sets.length} · tutma süresi</div><div class="big" id="pCd">${fmt(st.cd&&st.cd.end?(st.cd.end-Date.now())/1000:(+(st.sets[Math.min(doneSets,st.sets.length-1)].reps)||e.hold))}</div>
     <button class="btn pri" id="holdGo" style="min-width:180px" ${doneSets>=st.sets.length?'disabled':''}>${st.cd&&st.cd.end?'⏹ Durdur':'▶ Seti başlat'}</button></div>`;
  }else{
    body=`${l?`<div class="last">🕘 Geçen sefer (${l.date.split('-').reverse().join('.')}): ${l.sets.map(s=>`${kgf(+s.kg||0)} kg × ${s.reps}`).join(', ')}</div>`:`<div class="last">İlk kez yapıyorsun: ${esc(e.tip)}</div>`}
     ${sg&&sg.msg?`<div class="sugg">${sg.msg}</div>`:''}
     <div class="sets"><div class="hd"><span>Set</span><span>Ağırlık (kg)</span><span>Tekrar${e.perSide?' / taraf':''}</span><span>Bitti</span></div>
     ${st.sets.map((s,i)=>`<div class="s ${s.done?'done':''} ${i===doneSets?'cur':''}"><span class="n">Set ${i+1}</span><input inputmode="decimal" data-i="${i}" data-f="kg" value="${esc(s.kg)}" placeholder="kg"><input inputmode="numeric" data-i="${i}" data-f="reps" value="${esc(s.reps)}" placeholder="${e.reps[1]}"><button class="ok" data-ok="${i}" aria-label="Set ${i+1} bitti">${s.done?'✓':''}</button></div>`).join('')}</div>`;
  }
  const restHTML=W.rest?`<div class="rest"><div class="small" style="color:#bae6fd;font-weight:800">${W.rest.label||'Dinlenme'}</div><div class="big" id="pRest">${fmt((W.rest.end-Date.now())/1000)}</div><div class="row"><button class="btn" id="rMinus">−15 sn</button><button class="btn" id="rPlus">+15 sn</button><button class="btn pri" id="rSkip">Atla</button></div></div>`:'';
  const allDone=st.sets.every(s=>s.done);
  $('player').innerHTML=`<div class="phead"><button class="x" id="pX" aria-label="Kapat">✕</button><div class="t"><b>${esc(p.name)}</b><small>Aşama ${W.idx+1}/${n} · ${W.steps.filter(s=>s.sets.every(x=>x.done)).length} tamam</small></div><div class="tot">⏱ <span id="pTotal">${fmt((Date.now()-W.start)/1000)}</span></div></div>
   <div class="pbar"><i style="width:${Math.round(W.idx/(n-1)*100)}%"></i></div>
   <div class="pwrap">
    <div class="pimg" id="pImg"><img id="pImgEl" src="${imgSrc(e,0)}" alt="${esc(e.name)}"><span class="lbl" id="pImgLbl">Adım 1 · Başlangıç</span><span class="play" id="pImgPlay">${imgAuto?'⏸ Animasyon':'▶ Animasyon'}</span></div>
    <div class="ptitle">${esc(e.name)}<small>${esc(e.gym)} · 🎯 ${esc(e.muscle)}</small></div>
    <div class="plan">${planLine(e)}</div>
    <div class="pst"><div>Bu harekette<b id="pEx">${fmt(stepSpent(st))}</b></div><div>${isTimed?'Hedef':'Set'}<b>${isTimed?e.min+' dk':`${allDone?st.sets.length:curSet}/${st.sets.length}`}</b></div><div>Toplam<b id="pTotal2">${fmt((Date.now()-W.start)/1000)}</b></div></div>
    ${restHTML}${body}
    ${allDone&&!W.rest?`<div class="tipbox">✅ Bu aşama tamam! Aşağıdan <b>Sonraki aşamaya geç</b>.</div>`:''}
    <details style="margin:10px 0" ${l?'':'open'}><summary style="font-weight:800;min-height:44px;display:flex;align-items:center;cursor:pointer">📖 Adım adım nasıl yapılır?</summary>${stepsHTML(e)}${e.tip?`<div class="tipbox">🏋️ <b>Ağırlık:</b> ${esc(e.tip)}</div>`:''}<div class="warn">⚠️ <b>Sık hata:</b> ${esc(e.mistake)}</div></details>
    ${nx?`<div class="nextp"><img class="thumb" src="${imgSrc(nx,0)}" alt=""><div><div class="muted small">Sıradaki</div><b>${esc(nx.name)}</b><div class="muted small">${nx.type==='cardio'||nx.type==='stretch'?nx.min+' dk':`${nx.sets} × ${repTxt(nx)} · ~${estMin(nx)} dk`}</div></div></div>`:`<div class="nextp"><div style="font-size:30px">🏁</div><div><div class="muted small">Sıradaki</div><b>Antrenman bitti — özet</b></div></div>`}
   </div>`;
  $('pfoot').innerHTML=`<div class="r"><button class="btn" id="pPrev" ${W.idx===0?'disabled style="opacity:.4"':''}>‹ Önceki</button><button class="btn" id="pSkip">Atla ⏭</button></div>
   <button class="btn pri go" id="pNext">${W.idx===n-1?'🏁 Antrenmanı bitir':'Sonraki aşamaya geç ›'}</button>`;
  // olaylar
  $('pX').onclick=()=>{if(confirm('Antrenmanı şimdi bitirip kaydetmek ister misin?\n(İptal = başka seçenekler)'))finishWorkout();else if(confirm('Antrenman ekranı küçültülsün mü? Kaldığın yerden "Devam et" ile dönebilirsin.\n(İptal = antrenmanı kaydetmeden SİL)'))closePlayer();else if(confirm('Emin misin? Bu antrenman kaydedilmeden silinecek.')){W=null;saveW();closePlayer();}};
  $('pPrev').onclick=()=>gotoStep(W.idx-1);
  $('pSkip').onclick=()=>{if(W.idx===n-1)finishWorkout();else gotoStep(W.idx+1);};
  $('pNext').onclick=()=>{if(W.idx===n-1)finishWorkout();else gotoStep(W.idx+1);};
  $('pImg').onclick=()=>{imgAuto=!imgAuto;setupImg();};
  setupImg();
  const pl=$('player');
  pl.querySelectorAll('input[data-f]').forEach(inp=>inp.onchange=()=>{const s=st.sets[+inp.dataset.i];s[inp.dataset.f]=inp.value.replace(',','.');saveW();});
  pl.querySelectorAll('[data-ok]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.ok,s=st.sets[i];
    pl.querySelectorAll(`input[data-i="${i}"]`).forEach(inp=>s[inp.dataset.f]=inp.value.replace(',','.'));
    s.done=!s.done;s.at=s.done?Date.now():null;
    if(s.done){if(navigator.vibrate)navigator.vibrate(30);const left=st.sets.filter(x=>!x.done).length;
      W.rest={end:Date.now()+e.rest*1000,label:left?`Dinlenme · sıradaki: Set ${st.sets.findIndex(x=>!x.done)+1}/${st.sets.length}`:'Dinlenme · sonra sıradaki harekete geç',total:e.rest};}
    else W.rest=null;
    saveW();renderPlayer();
  });
  if(W.rest){$('rPlus').onclick=()=>{W.rest.end+=15000;saveW();pTick();};$('rMinus').onclick=()=>{W.rest.end-=15000;saveW();pTick();};$('rSkip').onclick=()=>{W.rest=null;saveW();renderPlayer();};}
  if(isTimed){
    $('cdGo').onclick=()=>{unlockAudio();const total=e.min*60;st.cd=st.cd||{left:total};
      if(st.cd.end){st.cd.left=Math.max(0,(st.cd.end-Date.now())/1000);st.cd.end=null;}else{if(st.cd.left<=0)st.cd.left=total;st.cd.end=Date.now()+st.cd.left*1000;}saveW();renderPlayer();};
    $('cdReset').onclick=()=>{st.cd={left:e.min*60};st.sets[0].done=false;saveW();renderPlayer();};
    $('cdDone').onclick=()=>{st.cd={left:0};st.sets[0].done=true;saveW();renderPlayer();};
  }
  if(e.type==='hold'){$('holdGo').onclick=()=>{unlockAudio();const i=st.sets.findIndex(x=>!x.done);if(i<0)return;
    if(st.cd&&st.cd.end){st.cd=null;}else{W.rest=null;st.cd={end:Date.now()+(+st.sets[i].reps||e.hold)*1000,set:i};}saveW();renderPlayer();};}
}
function setupImg(){
  clearInterval(imgTimer);const e=EXERCISES[cur().id];
  const show=()=>{const el=$('pImgEl');if(!el)return;el.src=imgSrc(e,imgFlip);$('pImgLbl').textContent=imgFlip?'Adım 2 · Hareket':'Adım 1 · Başlangıç';};
  if($('pImgPlay'))$('pImgPlay').textContent=imgAuto?'⏸ Animasyon':'▶ Animasyon';
  if(imgAuto)imgTimer=setInterval(()=>{imgFlip=1-imgFlip;show();},1400);else{imgFlip=1-imgFlip;show();}
}
function pTick(){
  if(!W||!$('player').classList.contains('on'))return;
  const now=Date.now(),st=cur(),e=EXERCISES[st.id];
  const T=fmt((now-W.start)/1000);if($('pTotal'))$('pTotal').textContent=T;if($('pTotal2'))$('pTotal2').textContent=T;
  if($('pEx'))$('pEx').textContent=fmt(stepSpent(st));
  if(W.rest){const left=(W.rest.end-now)/1000;if(left<=0){W.rest=null;saveW();beep(3);toast('⏰ Dinlenme bitti — sıradaki set!');renderPlayer();return;}if($('pRest'))$('pRest').textContent=fmt(Math.ceil(left));}
  if(st.cd&&st.cd.end){const left=(st.cd.end-now)/1000;
    if(left<=0){beep(3);
      if(e.type==='hold'){const i=st.cd.set;st.sets[i].done=true;st.cd=null;const rem=st.sets.filter(x=>!x.done).length;if(rem)W.rest={end:now+e.rest*1000,label:`Dinlenme · sıradaki: Set ${i+2}/${st.sets.length}`,total:e.rest};toast('✅ Set tamam!');}
      else{st.cd={left:0};st.sets[0].done=true;toast('✅ Süre doldu!');}
      saveW();renderPlayer();return;}
    if($('pCd'))$('pCd').textContent=fmt(Math.ceil(left));}
}
function finishWorkout(){
  const c=cur();if(c.enter){c.spent+=Date.now()-c.enter;c.enter=null;}
  const end=Date.now();let vol=0,setsDone=0,setsTotal=0;
  const steps=W.steps.map(st=>{const e=EXERCISES[st.id];const sets=st.sets.map(s=>({kg:+s.kg||0,reps:+s.reps||0,done:!!s.done}));
    if(e.type==='reps'||e.type==='hold'){setsTotal+=sets.length;setsDone+=sets.filter(s=>s.done).length;}
    if(e.type==='reps')vol+=sets.filter(s=>s.done).reduce((a,s)=>a+s.kg*s.reps*(e.perSide?2:1),0);
    return {id:st.id,spentSec:Math.round(st.spent/1000),sets};});
  const rec={date:keyOf(new Date(W.start)),prog:W.prog,start:W.start,end,durationSec:Math.round((end-W.start)/1000),volume:Math.round(vol),setsDone,setsTotal,steps};
  workouts().push(rec);const lg=ensureLog(rec.date);lg.training=true;save();
  W=null;saveW();clearInterval(ticker);clearInterval(imgTimer);
  showSummary(rec);
}
function showSummary(r){
  const p=PROGRAM[r.prog],whey=S.settings.items.find(i=>i.id==='whey2'),lg=getLog(r.date),wheyDone=whey&&lg.taken.whey2;
  $('player').innerHTML=`<div class="phead"><div class="t"><b>🏁 Antrenman tamam!</b><small>${esc(p.name)}</small></div></div><div class="pwrap">
   <div class="card" style="text-align:center"><div style="font-size:48px">💪</div><h2 style="font-size:24px">Harika iş, Abdullah!</h2>
   <div class="stats"><div class="stat"><b>${fmt(r.durationSec)}</b><span class="muted small">süre</span></div><div class="stat"><b>${kgf(r.volume)}</b><span class="muted small">kg toplam hacim</span></div><div class="stat"><b>${r.setsDone}/${r.setsTotal}</b><span class="muted small">set</span></div></div></div>
   ${whey?`<div class="card" style="border-color:var(--org)"><h2>🥤 Antrenman sonrası whey</h2><p style="margin:0 0 8px">1 ölçek whey'i 250–300 ml su/süt ile 1–2 saat içinde iç.</p><button class="btn ${wheyDone?'':'pri'} full" id="sumWhey">${wheyDone?'✓ İşaretlendi':'Whey\'i içtim, işaretle'}</button></div>`:''}
   <div class="card"><h2>Hareket bazında</h2>${r.steps.map(s=>{const e=EXERCISES[s.id];const d=s.sets.filter(x=>x.done);
     return `<div class="sumrow"><span><b>${esc(e.name)}</b><br><span class="muted small">${e.type==='reps'?(d.length?d.map(x=>`${kgf(x.kg)}×${x.reps}`).join(', '):'atlandı'):e.type==='hold'?d.map(x=>x.reps+' sn').join(', ')||'atlandı':(d.length?e.min+' dk':'atlandı')}</span></span><span style="text-align:right;white-space:nowrap">⏱ ${fmt(s.spentSec)}<br><span class="muted small">${e.type==='cardio'||e.type==='stretch'?'':`${d.length}/${s.sets.length} set`}</span></span></div>`;}).join('')}</div>
   <p class="muted small" style="text-align:center">Kaydedildi. Aylık takvimde 💪 olarak görünecek. Bir sonraki antrenmanda ağırlıklar otomatik dolacak.</p></div>`;
  $('pfoot').innerHTML=`<button class="btn pri go" id="sumClose">Kapat</button>`;
  $('sumClose').onclick=()=>{closePlayer();};
  if($('sumWhey'))$('sumWhey').onclick=()=>{const l=ensureLog(r.date);l.training=true;if(!l.taken.whey2)l.taken.whey2=r.date===todayKey()?nowHM():'sonradan';save();$('sumWhey').textContent='✓ İşaretlendi';$('sumWhey').classList.remove('pri');toast('🥤 Whey işaretlendi');};
  $('player').scrollTop=0;
  try{if(swReg&&Notification.permission==='granted')setTimeout(()=>{if(!getLog(r.date).taken.whey2)notify('🥤 Antrenman sonrası whey','1 ölçek whey içmeyi unutma!','whey-post');},30*60000);}catch(e){}
}
