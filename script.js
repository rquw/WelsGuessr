// ── API config (obfuscated) ──
(function(){
  function xd(h){
    var r='';
    for(var i=0;i<h.length;i+=2) r+=String.fromCharCode(parseInt(h.substr(i,2),16)^0x5A);
    return r;
  }
  window._cfg={
    u: xd('322e2e2a29607575332833343d3d312e2a293028233d2b3e2f2b3b3574292f2a3b383b293f743935'),
    k: xd('3f231032381d3933153310130f20136b143313291334086f3919136c13312a020c191063743f23102a39691733153310203e02183203371c2000091329133410360033136c133736233b0d6f3400682e6a3912142b39343634390d086b390d1c2c13332d33393763290009136c13371c2f38686e331619102a03020b3315301f6914200368170e39691420132913370c6e3919136c17301b6f17301f6f1720396917346a74620e2f0f632a313f111b34360f122d6c2d690d0b033d1729170b6b35053c356b2c313b1819181228682913')
  };
})();

var SB_URL = window._cfg.u;
var SB_KEY = window._cfg.k;

// VS-Log fürs Debugging: window.vsLogBuf, mit S.vsDebug=true auch in der Konsole
var _vsLogBuf = [];
function vsLog(ev) {
  try {
    var e = { t: new Date().toISOString().slice(11, 23), ev: ev, round: (typeof S !== 'undefined' ? S.round : '-'), room: (typeof S !== 'undefined' ? S.vsRoom : null) };
    _vsLogBuf.push(e); if (_vsLogBuf.length > 200) _vsLogBuf.shift();
    window.vsLogBuf = _vsLogBuf;
    if (typeof S !== 'undefined' && S.vsDebug) console.debug('[VS]', e.t, ev, '(r' + e.round + ')');
  } catch (_) {}
}

async function sbFetch(path, method, body) {
  method = method || 'GET';
  // Timeout, damit eine hängende Anfrage den Poll nicht blockiert
  var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var to = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (_) {} }, 8000) : null;
  try {
    var r = await fetch(SB_URL + '/rest/v1/' + path, {
      method: method,
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl ? ctrl.signal : undefined
    });
    var t = await r.text();
    var parsed = t ? JSON.parse(t) : null;
    if (!r.ok) { throw parsed || new Error('Request failed'); }
    return parsed;
  } finally { if (to) clearTimeout(to); }
}

// ── Audio ──
var AC = new (window.AudioContext || window.webkitAudioContext)();
function resumeAC() { if (AC.state === 'suspended') AC.resume(); }
document.addEventListener('click', resumeAC, {once:true});

var VOL = 1, VOL_STEPS = [1,.5,.2,0], volIdx = 0;
function cycleVolume() {
  volIdx = (volIdx+1)%VOL_STEPS.length;
  VOL = VOL_STEPS[volIdx];
  var labels = ['100%','50%','20%','🔇'];
  var vl=$('vol-label'); if(vl)vl.textContent = labels[volIdx];
}

function tone(freq,type,dur,vol,det,delay) {
  det=det||0; delay=delay||0;
  if(VOL===0) return;
  var o=AC.createOscillator(), g=AC.createGain();
  o.connect(g); g.connect(AC.destination);
  o.type=type; o.frequency.value=freq; o.detune.value=det;
  var t=AC.currentTime+delay;
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(vol*VOL,t+0.01);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.start(t); o.stop(t+dur+.05);
}
function chord(freqs,type,dur,vol,delay) {
  delay=delay||0;
  freqs.forEach(function(f,i){tone(f,type,dur,vol,0,delay+i*.012);});
}

var sfx = {
  fireCrackle: function(){},
  pin_placed: function(){
    // kleines, sattes Klack wenn der Pin gesetzt wird
    tone(520,'sine',.035,.09); tone(780,'sine',.05,.06,0,.018); tone(1040,'sine',.04,.04,0,.035);
  },
  guess: function(){
    // Raten-Button: markanteres Woosh
    chord([260,330,392],'sine',.22,.08);
    chord([392,494,587],'sine',.17,.06,.08);
    tone(784,'sine',.25,.07,0,.14);
    tone(1047,'sine',.12,.04,0,.22);
  },
  roundIntro: function(n){tone(330+n*22,'sine',.1,.09);tone(495+n*33,'sine',.14,.07,0,.07);tone(660+n*44,'sine',.1,.05,0,.13);},
  survivalIntro: function(n){
    if(VOL===0) return;
    // Dramatisches Feuerbrum + aufsteigender Swoosh
    var t=AC.currentTime;
    // Tiefes Dröhnen
    tone(55+n*4,'sawtooth',.35,.06,0,0);
    tone(82+n*6,'sawtooth',.28,.05,200,0);
    // Flammen-Swoosh (Rauschen aufsteigend)
    var len=Math.floor(AC.sampleRate*0.5);
    var buf=AC.createBuffer(1,len,AC.sampleRate);
    var d=buf.getChannelData(0);
    for(var i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(i/len,0.4)*Math.pow(1-i/len,1.5);
    var src=AC.createBufferSource(); src.buffer=buf;
    var f=AC.createBiquadFilter(); f.type='bandpass';
    f.frequency.setValueAtTime(200,t); f.frequency.exponentialRampToValueAtTime(2000+n*80,t+0.5);
    f.Q.value=0.5;
    var g=AC.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.22*VOL,t+0.1); g.gain.exponentialRampToValueAtTime(0.001,t+0.5);
    src.connect(f); f.connect(g); g.connect(AC.destination);
    src.start(t); src.stop(t+0.55);
    // Aufsteigender Ton
    tone(110+n*18,'sine',.4,.07,0,.05);
    tone(220+n*25,'sine',.3,.05,0,.15);
    tone(440+n*32,'sine',.2,.04,0,.28);
  },
  eliminated: function(){tone(330,'sine',.08,.1);tone(277,'sine',.12,.09,0,.1);tone(220,'sine',.18,.08,0,.2);tone(185,'sawtooth',.5,.06,0,.35);tone(165,'sawtooth',.4,.05,0,.65);},
  next: function(){tone(440,'sine',.09,.09);tone(660,'sine',.12,.07,0,.07);tone(880,'sine',.1,.05,0,.13);},
  bad: function(){tone(250,'sawtooth',.12,.07);tone(210,'sawtooth',.18,.06,0,.1);tone(175,'triangle',.3,.05,0,.2);tone(150,'triangle',.25,.04,0,.35);},
  okay: function(){chord([370,466,554],'sine',.18,.07);tone(622,'sine',.14,.05,0,.1);tone(740,'sine',.1,.03,0,.18);},
  good: function(){chord([523,659,784],'sine',.22,.1);tone(1047,'sine',.18,.06,0,.1);tone(1319,'sine',.12,.04,0,.18);},
  great: function(){chord([523,659,784,1047],'sine',.26,.1);chord([784,988,1175],'sine',.2,.07,.1);tone(1319,'sine',.18,.05,0,.2);tone(1568,'sine',.14,.03,0,.28);},
  amazing: function(){chord([523,659,784,1047],'sine',.3,.11);chord([784,988,1175,1319],'sine',.24,.08,.1);tone(1568,'sine',.2,.06,0,.18);tone(2093,'sine',.16,.04,0,.26);[0,1,2].forEach(function(i){tone(1047*Math.pow(2,i/12),'sine',.12,.04,0,.32+i*.06);});},
  perfect: function(){chord([523,659,784,1047,1319],'sine',.35,.11);chord([784,988,1175,1319,1568],'sine',.3,.08,.12);chord([1047,1319,1568,2093],'sine',.24,.06,.22);tone(2637,'sine',.2,.05,0,.3);tone(3136,'sine',.15,.03,0,.38);[0,1,2,3].forEach(function(i){tone(523*Math.pow(2,i/7),'triangle',.1,.03,0,.4+i*.07);});},
  start: function(){[0,.09,.18,.27,.36].forEach(function(d,i){tone(220*Math.pow(2,i/4),'sine',.32,.09,0,d);});chord([440,554,659],'sine',.4,.05,.4);},
  final: function(s){
    if(s>22000){[523,659,784,1047,1319,1568,2093].forEach(function(f,i){tone(f,'sine',.4,.1,0,i*.07);tone(f*2,'sine',.18,.04,0,i*.07+.08);});setTimeout(function(){chord([523,659,784,1047],'sine',.35,.09);},600);}
    else if(s>16000){[440,554,659,880,1047].forEach(function(f,i){tone(f,'sine',.32,.1,0,i*.09);});}
    else if(s>9000){[330,415,494,622].forEach(function(f,i){tone(f,'sine',.28,.09,0,i*.1);});}
    else{tone(220,'sawtooth',.55,.07);tone(210,'sawtooth',.5,.05,0,.28);tone(185,'triangle',.45,.04,0,.55);}
  }
};

// ── Survival Config ──
var SURVIVAL_THRESHOLDS = [500,700,800,1450,1600,1700,1800,2000,2700,3400,4100,4800];
var SURVIVAL_ROUNDS = 12;
function getSurvivalThreshold(round) {
  return SURVIVAL_THRESHOLDS[Math.min(round, SURVIVAL_THRESHOLDS.length-1)];
}

// ── "NEU" badge: hide after April 25 2026 ──
(function(){
  var cutoff = new Date('2026-04-26T00:00:00+02:00');
  if(new Date() >= cutoff){
    var el = document.getElementById('survival-neu-badge');
    if(el) el.style.display='none';
  }
})();

// ── State ──
var MAX_PTS=5000, CENTER=[48.157,14.028], NEXT_AUTO_SECS=20;
var SCORES_TABLE='wels_scores', DAILY_TABLE='wels_daily_scores';
var NAME_REGEX=/^[A-Za-z0-9.\-_]+$/;
var _heartbeatListenerAdded = false;
// Touch: Hover-Inhalte per Tippen erreichbar machen
var IS_TOUCH = (('ontouchstart' in window) || (navigator.maxTouchPoints>0));
try{ if(IS_TOUCH && document.body) document.body.classList.add('is-touch');
  else if(IS_TOUCH) document.addEventListener('DOMContentLoaded',function(){document.body.classList.add('is-touch');}); }catch(e){}

var S = {
  round:0, score:0, roundScores:[], locations:[], current:null,
  guessLatLng:null, map:null, resultMap:null, pinMarker:null,
  expanded:false, panoAngle:0, panoZoom:1, panoVOff:0, isDragging:false, dragStartX:0, dragStartAngle:0,
  isVs:false, vsRoom:null, vsIsHost:false, vsMyName:'', vsTheirName:'',
  vsMyScores:[], vsTheirScores:[],
  vsPollInterval:null, vsSpecPollInterval:null,
  vsTheirGuessLatLng:null,
  nextVotes:0, playAgainVotes:0,
  nextVoteTimer:null, nextVoteAutoTimer:null,
  myNextVoted:false, myPlayAgainVoted:false,
  vsTheirDone:false,
  skippedLocations:new Set(),
  panoLoadFailed:false,
  heartbeatInterval:null,
  mode:'solo',
  roundsTotal:5,
  dailyKey:'',
  dailyLocation:null,
  leaderboardTab:'all',
  lbSort:'pts',
  pendingSaveTarget:'global',
  isLoggedIn:false,
  loggedInName:'',
  loggedInPwHash:'',
  hasSavedThisRun:false,
  qrPendingCode:'',
  dailyTimerInterval:null,
  vsLeftShown:false,
  survivalEliminated:false,
  _leftGraceTimer:null
};

// ── Daily Streak ──
function getYesterdayKey() {
  var p=getViennaParts(), d=new Date(Date.UTC(p.year,p.month-1,p.day,12,0,0));
  d.setUTCDate(d.getUTCDate()-1); return d.toISOString().slice(0,10);
}
function getStreakDataLocal() {
  try { var raw=localStorage.getItem('wg_daily_streak'); if(!raw) return {count:0,lastDate:''}; return JSON.parse(raw); }
  catch(e) { return {count:0,lastDate:''}; }
}
function setStreakDataLocal(count, lastDate) {
  try{localStorage.setItem('wg_daily_streak',JSON.stringify({count:count,lastDate:lastDate}));}catch(e){}
}
async function updateStreak(dateKey) {
  var today=dateKey||getViennaDateKey(), yesterday=getYesterdayKey();
  if(S.isLoggedIn) {
    try {
      var rows=await sbFetch('players?name=ilike.'+encodeURIComponent(S.loggedInName)+'&select=streak_count,streak_last_date');
      if(!rows||!rows.length) return 0;
      var cur=rows[0], count=cur.streak_count||0, last=cur.streak_last_date||'';
      if(last===today) return count;
      var newCount=(last===yesterday)?count+1:1;
      await sbFetch('players?name=ilike.'+encodeURIComponent(S.loggedInName),'PATCH',{streak_count:newCount,streak_last_date:today});
      return newCount;
    } catch(e) { return 0; }
  }
  var data=getStreakDataLocal();
  if(data.lastDate===today) return data.count;
  var newCount=(data.lastDate===yesterday)?(data.count||0)+1:1;
  setStreakDataLocal(newCount,today);
  return newCount;
}
async function renderStreakDisplay(containerId) {
  var el=$(containerId); if(!el) return;
  var streak=0, today=getViennaDateKey(), yesterday=getYesterdayKey();
  if(S.isLoggedIn) {
    try {
      var rows=await sbFetch('players?name=ilike.'+encodeURIComponent(S.loggedInName)+'&select=streak_count,streak_last_date');
      if(rows&&rows.length) {
        var d=rows[0], count=d.streak_count||0, last=d.streak_last_date||'';
        if(last===today||last===yesterday) streak=count;
        else if(last) { streak=0; sbFetch('players?name=ilike.'+encodeURIComponent(S.loggedInName),'PATCH',{streak_count:0}).catch(function(){}); }
      }
    } catch(e) {}
  } else {
    var data=getStreakDataLocal();
    streak=data.count||0;
    if(data.lastDate&&data.lastDate!==today&&data.lastDate!==yesterday){ streak=0; setStreakDataLocal(0,data.lastDate); }
  }
  if(streak<1){el.style.display='none';return;}
  el.style.display='block';
  var label=streak===1?'Tag gespielt!':'Tage in Folge gespielt!';
  el.innerHTML='<div class="streak-pill" title="Streak anklicken für Details" onclick="this.classList.toggle(\'popped\')"><span class="streak-fire">🔥</span><span class="streak-num">'+streak+'</span><span> '+label+'</span></div>';
}

// ── Daily Timer ──
function getMsUntilNextDay() {
  var now=new Date(), viennaNow=new Date(now.toLocaleString('en-US',{timeZone:'Europe/Vienna'})), next=new Date(viennaNow);
  next.setHours(24,0,0,0); return next.getTime()-viennaNow.getTime();
}
function fmtCountdown(ms) {
  if(ms<0)ms=0; var s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
}
function startDailyTimers() {
  function tick(){var str=fmtCountdown(getMsUntilNextDay()),e1=$('menu-daily-timer'),e2=$('daily-screen-timer');if(e1)e1.textContent=str;if(e2)e2.textContent=str;}
  tick(); if(S.dailyTimerInterval)clearInterval(S.dailyTimerInterval); S.dailyTimerInterval=setInterval(tick,1000);
}

// ── Session ──
function saveSession(name,pwHash){try{localStorage.setItem('wg_name',name);localStorage.setItem('wg_ph',pwHash);}catch(e){}}
function loadSession(){try{return{name:localStorage.getItem('wg_name')||'',pwHash:localStorage.getItem('wg_ph')||''};}catch(e){return{name:'',pwHash:''};}}
function clearSession(){try{localStorage.removeItem('wg_name');localStorage.removeItem('wg_ph');}catch(e){}}
function refreshAuthUI(){
  var session=loadSession();
  S.isLoggedIn=!!(session.name&&session.pwHash);
  S.loggedInName=session.name||''; S.loggedInPwHash=session.pwHash||'';
  var btn=$('auth-btn');
  var profileBtn=$('profile-btn');
  if(S.isLoggedIn){
    btn.textContent='Abmelden ('+S.loggedInName+')'; btn.className='logged-in';
    if(profileBtn) profileBtn.style.display='flex';
    $('vs-host-name').value=S.loggedInName; $('vs-join-name').value=S.loggedInName; $('qr-join-name-input').value=S.loggedInName;
  } else { btn.textContent='↪ Anmelden'; btn.className='logged-out'; if(profileBtn) profileBtn.style.display='none'; }
}
function handleAuthBtn(){if(S.isLoggedIn)showLogoutConfirm();else openLoginModal();}
function showLogoutConfirm(){$('logout-confirm-overlay').classList.add('show');}
function closeLogoutConfirm(){$('logout-confirm-overlay').classList.remove('show');}
function confirmLogout(){clearSession();refreshAuthUI();closeLogoutConfirm();openLoginModal();}

function getOrCreateDeviceId(){
  var id=''; try{id=localStorage.getItem('wg_device_id')||'';}catch(e){}
  if(!id){id=crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2);try{localStorage.setItem('wg_device_id',id);}catch(e){}}
  return id;
}
function getDailyLocalKey(dateKey){return 'wg_daily_done_'+dateKey;}
function hasPlayedDailyLocally(dateKey){try{return localStorage.getItem(getDailyLocalKey(dateKey))==='1';}catch(e){return false;}}
function markDailyPlayedLocally(dateKey){try{localStorage.setItem(getDailyLocalKey(dateKey),'1');}catch(e){}}
function updateDailyPlayAvailability(){
  var btn=$('daily-play-btn'); if(!btn)return;
  var already=hasPlayedDailyLocally(getViennaDateKey());
  btn.disabled=already; btn.textContent=already?'Heute schon gespielt':'Spielen';
}
function markScoreSavedUI(){
  S.hasSavedThisRun=true; var btn=$('save-btn'); if(!btn)return;
  btn.disabled=true; btn.textContent='✓ Eingetragen!'; btn.classList.add('saved-ok');
}
function resetScoreSavedUI(){
  S.hasSavedThisRun=false; var btn=$('save-btn'); if(!btn)return;
  btn.disabled=false; btn.textContent='Punkte eintragen'; btn.classList.remove('saved-ok');
}
function updateSaveBtnVisibility(){
  var btn=$('save-btn'); if(!btn)return;
  if(S.isLoggedIn)btn.style.display='none'; else btn.style.display='';
}

// ── Backdrop ──
function setBackdrop(imgSrc){
  var bd=$('screen-backdrop');
  if(!imgSrc){bd.classList.remove('show');bd.style.backgroundImage='';return;}
  // erst anzeigen, wenn das Bild geladen ist (kein Aufblitzen/Umschalten auf Leeres)
  var _t=++setBackdrop._tok;
  var im=new Image();
  im.onload=function(){ if(_t!==setBackdrop._tok)return; bd.style.backgroundImage='url('+imgSrc+')'; bd.classList.add('show'); };
  im.src=imgSrc;
}
setBackdrop._tok=0;
// ── Bild-CDN (jsDelivr über GitHub-Repo, kostenlos, KEIN Bandbreitenlimit) ──
// Panorama-Bilder liegen im separaten öffentlichen Repo IMG_REPO und werden über jsDelivr ausgeliefert.
// (Avatare laufen weiterhin über Cloudinary – kleines Volumen.)
var IMG_REPO='rquw/welsguessr-images';   // pro Stadt eigenes Bild-Repo
var IMG_BASE='https://cdn.jsdelivr.net/gh/'+IMG_REPO+'@main/';
function panoFace(id,h){ return IMG_BASE+id+'_h'+String(h).padStart(3,'0')+'.jpg'; }
function panoThumb(id){ return IMG_BASE+id+'_h000.jpg'; }
function getRandomLocationImage(){
  if(!Array.isArray(LOCATIONS)||!LOCATIONS.length)return null;
  var loc=LOCATIONS[Math.floor(Math.random()*LOCATIONS.length)];
  return panoThumb(loc.id);
}
function getDailyLocationImage(){
  var key=getViennaDateKey(), loc=getDailyLocationForKey(key);
  if(!loc)return getRandomLocationImage();
  return panoThumb(loc.id);
}

// ── Helpers ──
var $=function(id){return document.getElementById(id);};

function show(id){
  document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active','visible');});
  var el=$(id); el.classList.add('active');
  requestAnimationFrame(function(){requestAnimationFrame(function(){el.classList.add('visible');});});
  if(id==='start-screen') setBackdrop(getRandomLocationImage());
  else if(id==='play-menu-screen'){setBackdrop(getRandomLocationImage());setMenuCardBackdrops();}
  else if(id==='daily-screen') setBackdrop(getDailyLocationImage());
  else if(id==='qr-join-screen') setBackdrop(getRandomLocationImage());
  else if(id==='info-screen') setBackdrop(getRandomLocationImage());
  else if(id==='game-screen') setBackdrop(null);
  else if(id==='result-screen') setBackdrop(null);
  else if(id==='final-screen'){setBackdrop(getRandomLocationImage());updateSaveBtnVisibility();}
}

function setMenuCardBackdrops(){
  if(!Array.isArray(LOCATIONS)||!LOCATIONS.length)return;
  var getRand=function(){return LOCATIONS[Math.floor(Math.random()*LOCATIONS.length)];};
  function setBg(el,u){ if(!el)return; if(window.pgSetBg)pgSetBg(el,u); else el.style.backgroundImage='url('+u+')'; }
  ['solo-card-bg','vs-card-bg','survival-card-bg'].forEach(function(id){
    var el=$(id); if(!el)return; setBg(el,panoThumb(getRand().id));
  });
  var dailyBg=$('daily-card-bg');
  if(dailyBg){var dloc=getDailyLocationForKey(getViennaDateKey());if(dloc)setBg(dailyBg,panoThumb(dloc.id));}
  var dpBg=$('daily-preview-bg');
  if(dpBg){
    var dLoc2=getDailyLocationForKey(getViennaDateKey());
    if(dLoc2){var src2=panoThumb(dLoc2.id);setBg(dpBg,src2);var img=new Image();img.onload=function(){dpBg.classList.add('loaded');};img.src=src2;}
  }
}

function openModal(id){
  var bg=$(id); bg.classList.add('open');
  requestAnimationFrame(function(){bg.classList.add('visible');var m=bg.querySelector('.modal');if(m)m.classList.add('in');});
  // Sanftes Modal-Öffnen-Geräusch
  tone(330,'sine',.04,.04); tone(440,'sine',.06,.03,0,.03);
}
function closeModal(id){
  var bg=$(id); bg.classList.remove('visible');
  var m=bg.querySelector('.modal'); if(m)m.classList.remove('in');
  setTimeout(function(){bg.classList.remove('open');},280);
  // Leises Modal-Schließen-Geräusch
  tone(330,'sine',.04,.03);
}

function shuffle(a){
  for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=a[i];a[i]=a[j];a[j]=tmp;}
  return a;
}

function haversine(a,b,c,d){
  var R=6371000,dA=(c-a)*Math.PI/180,dB=(d-b)*Math.PI/180,
    x=Math.sin(dA/2)*Math.sin(dA/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dB/2)*Math.sin(dB/2);
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function getActualLatLng(loc){return {lat:loc.lat,lng:loc.lng};}
function calcPts(d){
  if(d<=3)return 5000;
  if(d<=300)return Math.round(5000-100*Math.sqrt(d/300));
  return Math.round(Math.max(0,4900*Math.exp(-(d-300)/1000)));
}
function fmtD(m){return m<1000?Math.round(m)+' m':(m/1000).toFixed(2)+' km';}
function fmtN(n){return Number(n||0).toLocaleString('de');}
function fmtDate(d){
  if(!(d instanceof Date))d=new Date(d);
  var ymd=function(dt){return dt.toLocaleDateString('sv',{timeZone:'Europe/Vienna'});};
  var diff=Math.round((new Date(ymd(new Date()))-new Date(ymd(d)))/864e5);
  if(diff===0)return'Heute';if(diff===1)return'Gestern';if(diff===2)return'Vorgestern';
  return d.toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function hdg(a){return['N','NO','O','SO','S','SW','W','NW'][Math.round((((a%360)+360)%360)/45)%8];}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function countUp(el,target,dur,onDone){
  dur=dur||900;
  var start=performance.now(),from=parseInt(String(el.textContent).replace(/\D/g,''))||0;
  var lastTick=from,tickStep=Math.max(1,Math.abs(target-from)/18);
  (function f(now){
    var t=Math.min((now-start)/dur,1),e=1-Math.pow(1-t,3),cur=Math.round(from+e*(target-from));
    el.textContent=fmtN(cur);
    if(Math.abs(cur-lastTick)>=tickStep&&typeof VOL!=='undefined'&&VOL>0){lastTick=cur;try{tone(260+Math.min(Math.abs(cur)/5000,1)*360,'sine',0.022,0.03);}catch(_e){}}
    t<1?requestAnimationFrame(f):(el.textContent=fmtN(target),onDone&&onDone());
  })(performance.now());
}

function getViennaParts(date){
  date=date||new Date();
  var parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(date);
  var out={}; parts.forEach(function(p){if(p.type!=='literal')out[p.type]=p.value;});
  return{year:+out.year,month:+out.month,day:+out.day,hour:+out.hour,minute:+out.minute,second:+out.second};
}
function getViennaDateKey(date){
  var p=getViennaParts(date);
  return p.year+'-'+String(p.month).padStart(2,'0')+'-'+String(p.day).padStart(2,'0');
}
function getViennaDisplayDate(dateKey){
  var parts=dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('de-AT',{timeZone:'Europe/Vienna',weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date(Date.UTC(parts[0],parts[1]-1,parts[2],12,0,0)));
}
function getViennaMonthLabel(date){return new Intl.DateTimeFormat('de-AT',{timeZone:'Europe/Vienna',month:'long'}).format(date||new Date());}
function getWeekStartKeyVienna(date){
  var p=getViennaParts(date),base=new Date(Date.UTC(p.year,p.month-1,p.day,12,0,0)),weekday=(base.getUTCDay()+6)%7;
  base.setUTCDate(base.getUTCDate()-weekday); return base.toISOString().slice(0,10);
}
function hashStringSimple(str){
  var h=2166136261;
  for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
  return Math.abs(h>>>0);
}
function getDailyLocationForKey(key){
  if(!Array.isArray(LOCATIONS)||!LOCATIONS.length)return null;
  return LOCATIONS[hashStringSimple('welsuessr-daily-'+key)%LOCATIONS.length];
}

function verdict(p){
  var pools=[
    [4950,['Wohnst du da oder was?','Perfektion. Schlechthin.','Bist du sicher, dass du nicht geschummelt hast?','Fotografisches Gedächtnis.','Unglaublich. Einfach unglaublich.','Du WOHNST dort, oder?']],
    [4700,['Der war sehr gut.','Fast perfekt, fast.','Sehr stark, wirklich.','Du kennst Wels gut, nicht?','Beeindruckend.','Fast! Aber fast reicht nicht.']],
    [4300,['Sehr solid.','Klasse Runde!','Nicht schlecht, nicht schlecht.','Die Gegend hast du gefunden.','So geht das!','Sauber getroffen.']],
    [3600,['Ganz ordentlich.','Solide Leistung.','Kannst dich sehen lassen.','Nicht perfekt, aber gut.','Passt eh.','War ok das.']],
    [2800,['Mittelfeld. Geht so.','K\u00f6nnte besser sein.','Du bist irgendwie in der N\u00e4he.','War nicht optimal, aber ok.','Na ja. Hast du geschlafen?']],
    [2000,['Du warst in der N\u00e4he. Naja.','Hmm. N\u00e4chstes Mal besser.','Das war... mutig.','Schaffst mehr, ich glaubs.','Wels ist gro\u00df, aber nicht SO gro\u00df.']],
    [1200,['Hast du Wels schonmal auf der Karte gesehen?','Irgendwo in \u00d6sterreich immerhin.','Das war geraten und du wei\u00dft es.','Wenigstens im richtigen Land.','Zumindest europ\u00e4ischer Kontinent.']],
    [600,['War das Absicht?','Mutig geraten.','Du hast einfach irgendwo geklickt.','Wels ist in \u00d6sterreich. Nur zur Info.','Fast null, aber das schaffst du auch noch.']],
    [150,['Ich frage mich ob du \u00fcberhaupt hingeschaut hast.','Das war nicht okay. Wirklich nicht.','Fast kein Punkt. Fast.','Du probierst so wenig Punkte wie m\u00f6glich zu bekommen oder?','Ich bin nicht w\u00fctend, nur entt\u00e4uscht.']],
    [0,['Absolutes Meisterwerk des Versagens.','Du hast aktiv versucht falsch zu tippen.','Der wars wirklich ned.','Selbst mit verbundenen Augen w\u00e4rst du n\u00e4her dran.','Ich bin sprachlos.','Wels liegt in \u00d6sterreich, nicht im Meer.']]
  ];
  for(var i=0;i<pools.length;i++){
    if(p>=pools[i][0]){var o=pools[i][1];return o[Math.floor(Math.random()*o.length)];}
  }
  return 'Ernsthaft?';
}

function randomCode(){
  var c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6},function(){return c[Math.floor(Math.random()*c.length)];}).join('');
}

function showRoundPopup(text,isEmber){
  var el=$('round-popup');
  el.innerHTML=text; el.classList.toggle('ember',!!isEmber); el.classList.add('show');
  clearTimeout(showRoundPopup._t);
  showRoundPopup._t=setTimeout(function(){el.classList.remove('show');},1050);
}

function setDailyInfo(){
  S.dailyKey=getViennaDateKey(); S.dailyLocation=getDailyLocationForKey(S.dailyKey);
  $('daily-date-label').textContent=getViennaDisplayDate(S.dailyKey);
  $('daily-board-date').textContent=getViennaDisplayDate(S.dailyKey);
  var monthName=getViennaMonthLabel(new Date());
  monthName=monthName.charAt(0).toUpperCase()+monthName.slice(1);
  $('lb-tab-month').textContent=monthName;
  updateDailyPlayAvailability(); setMenuCardBackdrops();
}

// ── Navigation ──
function openInfoScreen(){show('info-screen');}
function openPlayMenu(){show('play-menu-screen');setMenuCardBackdrops();startDailyTimers();}
function goToStart(){show('start-screen');renderStreakDisplay('streak-display-start');}
var _logoClicks=0,_logoClickLast=0,_logoEggRunning=false;
function triggerLogoAnim(){
  var h=$('logo-h1'); if(!h)return;
  h.classList.remove('logo-pop');
  void h.offsetWidth; // reflow
  h.classList.add('logo-pop');
  setTimeout(function(){h.classList.remove('logo-pop');},750);
  // Easteregg: 3x klicken → Wels dehnt sich zu Wööö…sGuessr
  if(_logoEggRunning)return;
  var now=Date.now();
  if(now-_logoClickLast>2500)_logoClicks=0;
  _logoClickLast=now;
  if(++_logoClicks>=3){_logoClicks=0;playWoesEgg();}
}
function playWoesEgg(){
  var h=$('logo-h1'); if(!h)return;
  _logoEggRunning=true;
  h.classList.add('logo-woes');
  var seq=[];                       // ö hoch bis 9, kurz halten, dann runter auf 3
  for(var i=1;i<=9;i++)seq.push(i);
  seq.push(9,9);
  for(var j=8;j>=3;j--)seq.push(j);
  var k=0;
  (function step(){
    if(k>=seq.length){h.classList.remove('logo-woes');_logoEggRunning=false;return;}
    var n=seq[k++];
    h.innerHTML='W'+Array(n+1).join('ö')+'s<em>Guessr</em>';
    setTimeout(step,k<=10?95:150);  // hochzählen flott, runter etwas gemächlicher
  })();
}
function goToPlayMenu(){show('play-menu-screen');}
function openDailyScreen(){
  setDailyInfo();updateDailyPlayAvailability();
  show('daily-screen');setMenuCardBackdrops();loadDailyBoard();loadDailyChampions();startDailyTimers();
  renderStreakDisplay('streak-display-daily');
}

// ── Confetti ──
function launchConfetti(intensity){
  intensity=intensity||70;
  var layer=$('confetti-layer');
  var colors=['#c9a84c','#e8c86a','#f5f0e8','#8fa89a','#4a8c62','#ffffff','#ffd700','#ff9966'];
  for(var i=0;i<intensity;i++){
    var c=document.createElement('div'); c.className='confetti';
    c.style.left=Math.random()*100+'vw';
    c.style.background=colors[Math.floor(Math.random()*colors.length)];
    c.style.width=(6+Math.random()*9)+'px'; c.style.height=(10+Math.random()*15)+'px';
    c.style.borderRadius=Math.random()>.5?'2px':'999px';
    c.style.animationDuration=(2+Math.random()*2.2)+'s';
    c.style.animationDelay=(Math.random()*.4)+'s';
    layer.appendChild(c);
    setTimeout(function(el){return function(){el.remove();};}(c),5000);
  }
}

function playScoreSfx(points){
  if(points>=4980){sfx.perfect();launchConfetti(110);}
  else if(points>=4600){sfx.amazing();launchConfetti(60);}
  else if(points>=3500) sfx.great();
  else if(points>=2200) sfx.good();
  else if(points>=900) sfx.okay();
  else sfx.bad();
}

// ── Panorama ──
function loadPano(loc){
  if(!loc)return;   // Schutz: fehlender Ort (z.B. Daten-Mismatch) → kein Absturz
  var strip=$('pano-strip'); strip.innerHTML='';
  $('pano-error').classList.remove('show');
  S.panoLoadFailed=false; S.panoZoom=1; S.panoVOff=0; updatePanoZoom();
  var errors=0;
  [0,90,180,270].forEach(function(h){
    var src=panoFace(loc.id,h);
    var img=new Image(); img.src=src;
    img.onerror=function(){errors++;if(errors===4){
      S.panoLoadFailed=true; S._panoFailStreak=(S._panoFailStreak||0)+1;
      if(S._panoFailStreak>=3){
        // mehrere Standorte hintereinander tot → kein Endlos-Skip, sondern klare Meldung (z.B. CDN-Ausfall)
        var pe=$('pano-error'); if(pe){ var pp=pe.querySelector('p'); if(pp)pp.innerHTML='Bilder konnten gerade nicht geladen werden.<br>Bitte später nochmal versuchen.'; pe.classList.add('show'); }
        if(_ov&&_ov.parentNode)_ov.parentNode.removeChild(_ov);
      } else { setTimeout(function(){skipToNextLocation();},400); }
    }};
  });
  var _pc=$('pano-container'); var _ov=null;
  if(_pc){ _ov=document.createElement('div'); _ov.className='pano-loading'; _ov.innerHTML='<div class="pano-spinner"></div>'; _pc.appendChild(_ov); }   // sauberer Lade-Spinner bis die Bilder da sind
  var _disp=[0,90,180,270,0,90,180,270], _ld=0;
  function _tileDone(){ if(++_ld>=_disp.length&&_ov&&_ov.parentNode){_ov.parentNode.removeChild(_ov);} }
  _disp.forEach(function(h){
    var img=document.createElement('img');
    img.onload=function(){ S._panoFailStreak=0; _tileDone(); }; img.onerror=_tileDone;
    img.src=panoFace(loc.id,h);
    img.draggable=false; img.oncontextmenu=function(e){e.preventDefault();}; strip.appendChild(img);
  });
  S.panoAngle=0; setTimeout(updatePano,60);
}

function skipToNextLocation(){
  S.skippedLocations.add(S.current.id);
  var used=S.locations.slice(0,S.round+1).map(function(l){return l.id;});
  var unused=LOCATIONS.filter(function(l){return !S.skippedLocations.has(l.id)&&used.indexOf(l.id)===-1;});
  if(unused.length===0){
    $('pano-error').classList.remove('show');
    alert('Keine weiteren Standorte verfügbar. Runde wird mit 0 Punkten übersprungen.');
    S.guessLatLng={lat:CENTER[0],lng:CENTER[1]}; submitGuess(); return;
  }
  var replacement=unused[Math.floor(Math.random()*unused.length)];
  S.locations[S.round]=replacement; S.current=replacement; loadPano(replacement); initGameMap();
}

function updatePano(){
  var strip=$('pano-strip'),hw=strip.scrollWidth/2;
  if(!hw){setTimeout(updatePano,60);return;}
  strip.style.transform='translateX(-'+(((S.panoAngle%360)+360)%360)/360*hw+'px)';
  var cd=document.getElementById('compass-dir'); if(cd)cd.textContent=hdg(S.panoAngle);
  var ndl=document.querySelector('#compass .compass-needle'); if(ndl)ndl.style.transform='rotate('+(((S.panoAngle%360)+360)%360)+'deg)';
}
var PANO_MIN_ZOOM=1, PANO_MAX_ZOOM=3.2;
function clampZoom(z){return Math.max(PANO_MIN_ZOOM,Math.min(PANO_MAX_ZOOM,z));}
function updatePanoZoom(){
  var strip=$('pano-strip'),cont=$('pano-container'); if(!strip)return;
  // Mobile: leichter Overscan, damit nie ein schwarzer Rand zu sehen ist
  var coverPad=(typeof window!=='undefined'&&window.innerWidth<=768)?2.5:0;
  var ch=cont?cont.clientHeight:0;
  var zh=S.panoZoom*100+coverPad, H=ch*zh/100;
  strip.style.height=zh+'%';
  if(typeof S.panoVOff!=='number')S.panoVOff=0;
  var minOff=ch-H; if(minOff>0)minOff=0;
  if(S.panoZoom===1&&coverPad)S.panoVOff=minOff/2;   // Overscan vertikal zentrieren
  if(S.panoVOff>0)S.panoVOff=0; else if(S.panoVOff<minOff)S.panoVOff=minOff;
  strip.style.marginTop=(ch?S.panoVOff:0)+'px';
}
// Zoom um die Mausposition, der Punkt unterm Cursor bleibt stehen
function zoomPanoAtPoint(newZoom,clientX,clientY){
  var strip=$('pano-strip'),el=$('pano-container'); if(!strip||!el)return;
  var rect=el.getBoundingClientRect();
  var xc=(clientX==null?rect.width/2:clientX-rect.left);
  var yc=(clientY==null?rect.height/2:clientY-rect.top);
  var hwOld=strip.scrollWidth/2, Hold=S.panoZoom*rect.height;
  var fY=Hold>0?(yc-S.panoVOff)/Hold:0.5;
  S.panoZoom=clampZoom(newZoom);
  strip.style.height=(S.panoZoom*100)+'%'; // Höhe sofort setzen, damit scrollWidth stimmt
  var hwNew=strip.scrollWidth/2, Hnew=S.panoZoom*rect.height;
  if(hwOld&&hwNew) S.panoAngle += xc*360*(1/hwOld-1/hwNew); // horizontal verankern
  S.panoVOff = yc - fY*Hnew;                                  // vertikal verankern
  updatePanoZoom(); updatePano();
}
function rotatePanoByPixels(px){
  var strip=$('pano-strip'); if(!strip)return;
  var hw=strip.scrollWidth/2; if(!hw)return;
  S.panoAngle+=px/(hw/S.panoZoom)*360; updatePano();
}

function initPanoDrag(){
  var pc=$('pano-container'); if(pc)pc.style.overflow='hidden';
  var ps=$('pano-strip'); if(ps)ps.style.overflow='hidden';
  var el=$('pano-container');
  el.onmousedown=function(e){
    if(e.button!==0)return;
    if(S.mpNoLook)return;   // Modifier "nicht umsehen"
    resumeAC(); S.isDragging=true; S.dragStartX=e.clientX; S.dragStartAngle=S.panoAngle;
    el.style.cursor='grabbing'; e.preventDefault();
  };
  window.onmousemove=function(e){
    if(!S.isDragging)return;
    var hw=$('pano-strip').scrollWidth/2;
    if(hw) S.panoAngle=S.dragStartAngle-(e.clientX-S.dragStartX)/(hw/S.panoZoom)*360;
    updatePano();
  };
  window.onmouseup=function(){S.isDragging=false;el.style.cursor='grab';};
  // Touch: 1 Finger = drehen, 2 Finger = zoomen (Pinch) + drehen
  var pinch=null; // {dist, zoom, midX, angle}
  function touchDist(t){var dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.sqrt(dx*dx+dy*dy);}
  el.ontouchstart=function(e){
    if(S.mpNoLook)return;   // Modifier "nicht umsehen"
    resumeAC();
    if(e.touches.length>=2){
      S.isDragging=false;
      pinch={dist:touchDist(e.touches),zoom:S.panoZoom,midX:(e.touches[0].clientX+e.touches[1].clientX)/2,angle:S.panoAngle};
      e.preventDefault();
    } else {
      pinch=null; S.isDragging=true; S.dragStartX=e.touches[0].clientX; S.dragStartAngle=S.panoAngle;
    }
  };
  el.ontouchmove=function(e){
    if(pinch&&e.touches.length>=2){
      var d=touchDist(e.touches); if(pinch.dist>0)S.panoZoom=clampZoom(pinch.zoom*(d/pinch.dist));
      var _ch=$('pano-container').clientHeight; S.panoVOff=-(S.panoZoom-1)*_ch/2; // vertikal zentriert halten
      updatePanoZoom();
      var mid=(e.touches[0].clientX+e.touches[1].clientX)/2,hw=$('pano-strip').scrollWidth/2;
      if(hw)S.panoAngle=pinch.angle-(mid-pinch.midX)/(hw/S.panoZoom)*360;
      updatePano(); e.preventDefault(); return;
    }
    if(!S.isDragging)return;
    var hw2=$('pano-strip').scrollWidth/2;
    if(hw2) S.panoAngle=S.dragStartAngle-(e.touches[0].clientX-S.dragStartX)/(hw2/S.panoZoom)*360;
    updatePano(); e.preventDefault();
  };
  el.ontouchend=function(e){if(!e.touches||e.touches.length<2)pinch=null;if(!e.touches||e.touches.length===0)S.isDragging=false;};
  // Wheel/Trackpad: seitwärts (2 Finger) = drehen, vertikal/Pinch = zoomen
  el.addEventListener('wheel',function(e){
    if(S.mpNoLook){e.preventDefault();return;}   // Modifier "nicht umsehen"
    resumeAC();
    if(e.ctrlKey){ // Trackpad-Pinch: an Cursor zoomen
      zoomPanoAtPoint(S.panoZoom*(1-e.deltaY*0.012),e.clientX,e.clientY); e.preventDefault(); return;
    }
    if(Math.abs(e.deltaX)>Math.abs(e.deltaY)){ rotatePanoByPixels(e.deltaX); e.preventDefault(); return; }
    if(e.shiftKey){ rotatePanoByPixels(e.deltaY); e.preventDefault(); return; }
    // Mausrad vertikal: an Cursor zoomen
    zoomPanoAtPoint(S.panoZoom*(1-e.deltaY*0.0015),e.clientX,e.clientY); e.preventDefault();
  },{passive:false});
  el.style.cursor='grab';
  setTimeout(function(){var h=$('drag-hint');if(h)h.style.opacity='0';},3500);
}

document.addEventListener('mousedown',function(e){
  if(e.button===1&&$('map-panel').contains(e.target)){e.preventDefault();toggleExpand();}
});

// ── Game Map ──
function initGameMap(){
  if(S.map){S.map.remove();S.map=null;}
  var mapBounds=[[48.06,13.87],[48.27,14.18]];
  S.map=L.map('map-el',{center:CENTER,zoom:14,maxBounds:mapBounds,minZoom:12,maxZoom:19,zoomControl:false,attributionControl:false});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,maxNativeZoom:19}).addTo(S.map);
  setTimeout(function(){
    if(!S.map)return;
    S.map.setView(CENTER,14); S.map.invalidateSize();
    var corners=[[47.88,14.22],[47.88,14.50],[48.01,14.22],[48.01,14.50]],ci=0;
    var preload=setInterval(function(){
      if(!S.map){clearInterval(preload);return;}
      if(ci<corners.length){S.map.panTo(corners[ci],{animate:false});ci++;}
      else{clearInterval(preload);S.map.setView(CENTER,14,{animate:false});}
    },60);
  },150);
  S.map.on('click',function(e){resumeAC();placePin(e.latlng);});
  S.map.on('mouseover',function(){S.map.invalidateSize();});
  S.pinMarker=null; S.guessLatLng=null;
  $('guess-btn').disabled=true; $('pin-hint').textContent='Karte anklicken';
}

var _pinIcon=L.divIcon({
  className:'leaflet-pin-icon',
  html:'<div class="map-pin-marker"><div class="map-pin-dot"></div></div>',
  iconSize:[28,36],iconAnchor:[14,46],popupAnchor:[0,-34]
});

function placePin(ll){
  if(S.pinMarker)S.map.removeLayer(S.pinMarker);
  S.pinMarker=L.marker(ll,{icon:_pinIcon,draggable:true,autoPan:true}).addTo(S.map);
  requestAnimationFrame(function(){var el=S.pinMarker.getElement();if(el){el.classList.remove('pin-drop');void el.offsetWidth;el.classList.add('pin-drop');}});
  S.pinMarker.on('dragend',function(e){S.guessLatLng=e.target.getLatLng();sfx.pin_placed();});
  S.guessLatLng=ll;
  $('guess-btn').disabled=false; $('guess-btn').dataset.justEnabled='1';
  setTimeout(function(){if($('guess-btn'))delete $('guess-btn').dataset.justEnabled;},400);
  $('pin-hint').textContent='Pin setzen & ziehen'; sfx.pin_placed();
}

function clearPin(){
  if(S.pinMarker){S.map.removeLayer(S.pinMarker);S.pinMarker=null;}
  S.guessLatLng=null; $('guess-btn').disabled=true; $('pin-hint').textContent='Karte anklicken';
}
function toggleExpand(){
  S.expanded=!S.expanded; $('map-panel').classList.toggle('expanded',S.expanded);
  setTimeout(function(){if(S.map)S.map.invalidateSize();},260);
}

// ── Game Flow ──
function resetBaseState(){
  S.round=0; S.score=0; S.roundScores=[]; S.skippedLocations=new Set();
  S.expanded=false; S.vsLeftShown=false; S.survivalEliminated=false;
  $('map-panel').classList.remove('expanded');
  S.guessLatLng=null; S.panoAngle=0; S.panoZoom=1; S.panoVOff=0;
  $('score-display').textContent='0';
  $('score-verdict').classList.remove('in'); $('score-verdict').textContent='';
  $('vs-bottom-wait').classList.remove('show'); $('vs-left-msg').classList.remove('show');
  $('survival-fail-overlay').classList.remove('show');
  $('survival-badge').classList.remove('show'); $('survival-badge').textContent='';
  clearSubmitCountdown();
  var pab=$('play-again-btn');
  if(pab){pab.disabled=false;pab.textContent='Nochmal';pab.style.display='';}
  S.myPlayAgainVoted=false; S.playAgainVotes=0;
  $('play-again-vote').style.display='none'; $('play-again-vote').textContent='';
}

function updateSurvivalHUD(){
  var badge=$('survival-badge');
  if(S.mode!=='survival'){badge.classList.remove('show');return;}
  badge.textContent='🔥 Min. '+fmtN(getSurvivalThreshold(S.round))+' Pkt. nötig';
  badge.classList.add('show');
}

function startSolo(){
  resetScoreSavedUI(); resumeAC(); sfx.start(); S.mode='solo'; S.roundsTotal=5;
  var hb=$('back-to-home-btn'); if(hb)hb.style.display='block';
  resetBaseState(); S.isVs=false;
  if(S.vsPollInterval){clearInterval(S.vsPollInterval);S.vsPollInterval=null;}
  S.locations=shuffle(LOCATIONS.slice()).slice(0,S.roundsTotal);
  $('vs-badge').style.display='none'; $('vs-strip').style.display='none'; $('round-total').textContent=S.roundsTotal;
  show('game-screen'); initPanoDrag(); loadRound();
}

function startSurvival(){
  resetScoreSavedUI(); resumeAC(); S.mode='survival'; S.roundsTotal=SURVIVAL_ROUNDS;
  var hb=$('back-to-home-btn'); if(hb)hb.style.display='block';
  resetBaseState(); S.isVs=false;
  if(S.vsPollInterval){clearInterval(S.vsPollInterval);S.vsPollInterval=null;}
  S.locations=shuffle(LOCATIONS.slice()).slice(0,SURVIVAL_ROUNDS);
  $('vs-badge').style.display='none'; $('vs-strip').style.display='none'; $('round-total').textContent=SURVIVAL_ROUNDS;
  showSurvivalExplain();
}

// Erklär-Overlay vor der ersten Runde
function showSurvivalExplain(){
  var ov=$('survival-explain-overlay'); if(!ov){beginSurvivalRounds();return;}
  // Alle Texte kommen aus text.js (T)
  if(typeof T!=='undefined'){
    var card=ov.querySelector('.se-card');
    var b=card.querySelector('.se-badge'); if(b)b.textContent=T.survivalExplainBadge;
    var ti=card.querySelector('.se-title'); if(ti)ti.textContent=T.survivalExplainTitle;
    var st=card.querySelector('.se-start'); if(st)st.textContent=T.survivalExplainStart;
    var rulesEl=card.querySelector('.se-rules');
    if(rulesEl&&T.survivalExplainRules){
      rulesEl.innerHTML='';
      var first=fmtN(getSurvivalThreshold(0)), last=fmtN(getSurvivalThreshold(SURVIVAL_ROUNDS-1));
      T.survivalExplainRules.forEach(function(r){
        var html=String(r.html).replace('{first}',first).replace('{last}',last);
        var d=document.createElement('div'); d.className='se-rule';
        d.innerHTML='<span class="se-ico">'+r.icon+'</span><div>'+html+'</div>';
        rulesEl.appendChild(d);
      });
    }
  }
  var svg=$('se-flames-svg'); if(svg)buildFlamesSVG(svg,18);
  addEmbers($('se-embers'),18);
  ov.classList.remove('show'); void ov.offsetWidth; ov.classList.add('show');
  if(sfx&&sfx.survivalIntro)sfx.survivalIntro(1);
  if(ov._emberTimer)clearInterval(ov._emberTimer);
  ov._emberTimer=setInterval(function(){if(ov.classList.contains('show'))addEmbers($('se-embers'),6);else clearInterval(ov._emberTimer);},1400);
}
function beginSurvivalRounds(){
  var ov=$('survival-explain-overlay'); if(ov){ov.classList.remove('show');if(ov._emberTimer)clearInterval(ov._emberTimer);}
  resumeAC(); sfx.start();
  show('game-screen'); initPanoDrag(); loadRound();
}

function startDailyChallenge(){
  var todayKey=getViennaDateKey();
  if(hasPlayedDailyLocally(todayKey)){alert('Du hast die tägliche Challenge auf diesem Gerät heute schon gespielt.');return;}
  resetScoreSavedUI(); resumeAC(); sfx.start();
  var _hbd=$('back-to-home-btn'); if(_hbd)_hbd.style.display='none';
  S.mode='daily'; S.roundsTotal=1; resetBaseState(); S.isVs=false;
  if(S.vsPollInterval){clearInterval(S.vsPollInterval);S.vsPollInterval=null;}
  S.dailyKey=todayKey; S.dailyLocation=getDailyLocationForKey(S.dailyKey);
  S.locations=[S.dailyLocation];
  $('vs-badge').style.display='none'; $('vs-strip').style.display='none'; $('round-total').textContent='1';
  show('game-screen'); initPanoDrag(); loadRound();
}

// ── Survival round intro ──
function buildFlamesSVG(svg, count){
  svg.innerHTML='';
  var defs0=document.createElementNS('http://www.w3.org/2000/svg','defs');
  var filt=document.createElementNS('http://www.w3.org/2000/svg','filter');
  filt.setAttribute('id','baseBlur');
  var fe=document.createElementNS('http://www.w3.org/2000/svg','feGaussianBlur');
  fe.setAttribute('stdDeviation','12'); filt.appendChild(fe); defs0.appendChild(filt); svg.appendChild(defs0);
  var bgGlow=document.createElementNS('http://www.w3.org/2000/svg','ellipse');
  bgGlow.setAttribute('cx','200');bgGlow.setAttribute('cy','200');bgGlow.setAttribute('rx','180');bgGlow.setAttribute('ry','30');
  bgGlow.setAttribute('fill','rgba(224,92,42,0.18)');bgGlow.setAttribute('filter','url(#baseBlur)');
  svg.appendChild(bgGlow);
  var H=200;
  var palettes=[['#fff0a0','#f5843a','#c93a10'],['#ffe066','#f07d4a','#d04010'],['#fff4b0','#ff9944','#c03a10'],['#ffd080','#e05c2a','#b03010']];
  function makeFlamePath(x,hh,w,reverse){
    var hw=w/2,lean=reverse?-1:1;
    var c1x=x-hw*1.1*lean,c2x=x-hw*.4*lean,c3x=x+hw*.4*lean,c4x=x+hw*1.0*lean;
    return 'M'+x+','+H+' C'+c1x+','+(H-hh*.25)+' '+c2x+','+(H-hh*.72)+' '+x+','+(H-hh)+' C'+c3x+','+(H-hh*.72)+' '+c4x+','+(H-hh*.25)+' '+x+','+H+'Z';
  }
  [{scale:1.3,opMul:.35,classN:'flame-path flame-glow'},{scale:1,opMul:1,classN:'flame-path'}].forEach(function(layer){
    for(var i=0;i<count;i++){
      var x=8+Math.random()*384,baseH=(50+Math.random()*130)*layer.scale,w=(14+Math.random()*36)*layer.scale;
      var pal=palettes[Math.floor(Math.random()*palettes.length)],reverse=Math.random()>.5;
      var gradId='fg'+layer.classN.replace(/\s/g,'')+i;
      var defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
      var grad=document.createElementNS('http://www.w3.org/2000/svg','linearGradient');
      grad.setAttribute('id',gradId);grad.setAttribute('x1','0%');grad.setAttribute('y1','100%');grad.setAttribute('x2','0%');grad.setAttribute('y2','0%');
      [[0,pal[2],'0.9'],[0.35,pal[1],'0.85'],[0.72,pal[0],'0.7'],[1,pal[0],'0']].forEach(function(s){
        var stop=document.createElementNS('http://www.w3.org/2000/svg','stop');
        stop.setAttribute('offset',s[0]);stop.setAttribute('stop-color',s[1]);stop.setAttribute('stop-opacity',s[2]);grad.appendChild(stop);
      });
      defs.appendChild(grad);svg.appendChild(defs);
      var path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',makeFlamePath(x,baseH,w,reverse));path.setAttribute('fill','url(#'+gradId+')');path.setAttribute('class',layer.classN);
      path.style.setProperty('--fd',(1.2+Math.random()*1.1)+'s');
      path.style.setProperty('--fo',((.55+Math.random()*.35)*layer.opMul)+'');
      path.style.animationDelay=(Math.random()*1.1)+'s';svg.appendChild(path);
    }
  });
}

function addEmbers(container,count){
  if(!container)return;
  var colors=['#ffdd88','#ff9944','#f07d4a','#fff0a0','#ff6622'];
  for(var i=0;i<count;i++){
    var e=document.createElement('div'),big=Math.random()>.75;
    e.className='survival-ember'+(big?' survival-ember-big':'');
    e.style.left=(3+Math.random()*94)+'%';
    e.style.background=colors[Math.floor(Math.random()*colors.length)];
    var dur=1.6+Math.random()*2.4;
    e.style.setProperty('--ed',dur+'s');e.style.setProperty('--edl',(Math.random()*1.5)+'s');e.style.setProperty('--ex',(-30+Math.random()*60)+'px');
    container.appendChild(e);
    setTimeout(function(el){if(el.parentNode)el.remove();},7000,e);
  }
}

function showSurvivalRoundIntro(roundNum,threshold,onDone){
  var overlay=$('survival-intro-overlay');
  $('survival-intro-round-num').textContent=roundNum+' / '+SURVIVAL_ROUNDS;
  $('survival-intro-threshold-num').textContent=fmtN(threshold)+' Pkt.';
  buildFlamesSVG($('survival-flames-svg'),14);
  overlay.classList.add('show'); addEmbers($('survival-intro-flames'),10);
  var c=$('survival-intro-content'); c.style.animation='none'; void c.offsetWidth; c.style.animation='';
  clearTimeout(showSurvivalRoundIntro._t);
  showSurvivalRoundIntro._t=setTimeout(function(){overlay.classList.remove('show');if(onDone)onDone();},3500);
}

// ── Survival score reveal ──
function showSurvivalScoreReveal(pts,threshold,onDone){
  var overlay=$('survival-score-overlay');
  var numEl=$('survival-score-num'),barFill=$('survival-score-bar-fill'),marker=$('survival-score-threshold-marker');
  var verdictEl=$('survival-score-verdict'),thresholdLabelBar=$('survival-score-threshold-label-bar');
  var passed=(pts>=threshold);
  numEl.textContent='0'; numEl.className=''; numEl.style.animation='none'; void numEl.offsetWidth;
  barFill.style.width='0%'; barFill.className=''; verdictEl.className=''; verdictEl.textContent='';
  var markerPct=Math.min(threshold/5000*100,100);
  marker.style.left=markerPct+'%';
  thresholdLabelBar.textContent='Ziel: '+fmtN(threshold);
  thresholdLabelBar.style.cssText='position:absolute;left:'+markerPct+'%;transform:translateX(-50%);bottom:100%;margin-bottom:3px;white-space:nowrap;font-size:.58rem;color:#c9a84c;pointer-events:none;';
  _spawnScoreFlames(overlay,null,passed);
  overlay.classList.add('show');
  var startTime=performance.now(),DUR=2000,_srLastClick=0,_srLastVal=0;
  function tick(now){
    var t=Math.min((now-startTime)/DUR,1),ease=1-Math.pow(1-t,3),cur=Math.round(ease*pts);
    numEl.textContent=fmtN(cur);
    barFill.style.width=Math.min(cur/5000*100,100)+'%';
    if(cur>=threshold&&!barFill.classList.contains('passed')){
      barFill.classList.add('passed');
      numEl.classList.add('passed'); numEl.style.animation='sNumPop .55s cubic-bezier(.16,1,.3,1) both';
      _extinguishFlames(overlay);
    }
    if(t<1){
      // "drrr": mechanische Klicks während die Punkte hochzählen (ein Klick je +1-Sprung)
      if(cur>_srLastVal&&(now-_srLastClick)>=26){ _srLastClick=now; _srLastVal=cur; if(!(typeof VOL!=='undefined'&&VOL===0))tone(340+t*260+(Math.random()*30-15),'square',0.015,0.045*(0.6+0.4*(1-t)),0,0); }
      requestAnimationFrame(tick);
    }
    else{
      numEl.textContent=fmtN(pts); barFill.style.width=Math.min(pts/5000*100,100)+'%';
      if(passed){numEl.classList.add('passed');barFill.classList.add('passed');verdictEl.textContent='Schwelle geschafft! 🔥';verdictEl.classList.add('show','passed');}
      else{numEl.classList.add('failed');verdictEl.textContent='Ausgeschieden.';verdictEl.classList.add('show','failed');}
      sfx[passed?'good':'eliminated']&&sfx[passed?'good':'eliminated']();
      setTimeout(function(){overlay.classList.remove('show');_clearScoreFlames(overlay);if(onDone)onDone();},passed?1600:2200);
    }
  }
  setTimeout(function(){requestAnimationFrame(tick);},200);
}

var _scoreFlameEls=[];
function _spawnScoreFlames(overlay,canvas,passed){
  _clearScoreFlames(overlay);
  var colors=passed?['#f5d060','#e8c060','#c9a84c']:['#e05c2a','#f07d4a','#c03a10','#ff9944'];
  for(var i=0;i<28;i++){
    var el=document.createElement('div'); el.className='ss-flame';
    var w=20+Math.random()*50,h=-(80+Math.random()*220);
    el.style.setProperty('--fw',w+'px');el.style.setProperty('--fh',h+'px');
    el.style.setProperty('--fc',colors[Math.floor(Math.random()*colors.length)]);
    el.style.setProperty('--fdd',(1.4+Math.random()*1.6)+'s');el.style.setProperty('--fdel',(Math.random()*1.2)+'s');
    el.style.left=(Math.random()*100)+'%'; el.style.height=w+'px';
    overlay.appendChild(el); _scoreFlameEls.push(el);
  }
}
function _extinguishFlames(overlay){_scoreFlameEls.forEach(function(el){el.style.transition='opacity .6s ease';el.style.opacity='0';});}
function _clearScoreFlames(overlay){_scoreFlameEls.forEach(function(el){if(el.parentNode)el.parentNode.removeChild(el);});_scoreFlameEls=[];}

function loadRound(){
  S.current=S.locations[S.round];
  if(!S.current){ if(S.isVs){showFinal();} return; }   // Schutz: kein Ort für diese Runde
  $('round-num').textContent=S.round+1; $('score-display').textContent=fmtN(S.score);
  hideSkipPanoBtn();
  // Mehrspieler: Modifiers + Rundenuhr anwenden; Solo: Weiter-Button sichtbar
  var _nb=$('next-btn'); if(_nb)_nb.style.display=S.isVs?'none':'';
  if(S.isVs&&typeof applyMpModifiers==='function'){applyMpModifiers();mpStartRoundClock();}
  else{if(typeof mpClearMods==='function')mpClearMods();}
  var _og=$('vs-opponent-guessed');if(_og){_og.classList.remove('show');if(_og._t)clearTimeout(_og._t);}
  // difficulty badge sofort auf 'Unbestimmt' setzen, dann nachladen
  var diffBadgeEl=document.getElementById('top-bar-diff');
  if(diffBadgeEl){diffBadgeEl.textContent='';diffBadgeEl.style.display='none';}
  if(S.current&&typeof loadDifficultyBadge==='function') loadDifficultyBadge(S.current.id);
  var f=$('round-flash'); f.classList.remove('ember-flash');
  if(S.mode==='survival')f.classList.add('ember-flash');
  f.classList.add('on'); setTimeout(function(){f.classList.remove('on');},180);
  if(S.mode==='survival'){
    sfx.survivalIntro(S.round+1);
    if(VOL>0){for(var _fc=0;_fc<5;_fc++){(function(d){setTimeout(function(){sfx.fireCrackle&&sfx.fireCrackle();},d);})(300+_fc*750);}}
    updateSurvivalHUD();
    loadPano(S.current); initGameMap();
    showSurvivalRoundIntro(S.round+1,getSurvivalThreshold(S.round),null);
  } else {
    sfx.roundIntro(S.round+1);
    showRoundPopup('Runde <span>'+(S.round+1)+'/'+S.roundsTotal+'</span>');
    loadPano(S.current); initGameMap();
  }
}

function submitGuess(){
  if(!S.guessLatLng)return;
  sfx.guess();
  var loc=S.current,actual=getActualLatLng(loc);
  var dist=haversine(S.guessLatLng.lat,S.guessLatLng.lng,actual.lat,actual.lng);
  var pts=calcPts(dist);
  // Entwickler-Cheat: in Hitzewelle mit gehaltener W-Taste automatisch die Schwelle schaffen
  if(S.mode==='survival'&&isDevAccount()&&_wKeyDown){ pts=Math.max(pts,getSurvivalThreshold(S.round)); }
  S.score+=pts; S.roundScores.push({round:S.round+1,dist:dist,pts:pts});
  $('res-dist').textContent=fmtD(dist); $('res-pts').textContent='0'; $('res-total').textContent=fmtN(S.score);
  var isLast=S.round>=S.roundsTotal-1;
  $('next-btn').textContent=(isLast?'Ergebnis sehen →':'Nächste Runde →')+' ';
  var kbdSpan=document.createElement('span'); kbdSpan.className='kbd-hint'; kbdSpan.textContent='SPACE'; $('next-btn').appendChild(kbdSpan);
  $('next-btn').disabled=false;
  $('score-verdict').textContent=''; $('score-verdict').classList.remove('in');
  $('vs-their-guess-row').style.display='none';
  $('next-vote-bar').classList.remove('show'); $('next-vote-bar').textContent='';
  S.myNextVoted=false; S.nextVotes=0; $('vs-bottom-wait').classList.remove('show');
  var survivalThresholdEl=$('survival-threshold-row'); survivalThresholdEl.classList.remove('show');
  if(S.mode==='survival'){
    var threshold=getSurvivalThreshold(S.round);
    if(pts<threshold){
      S.survivalEliminated=true;
      survivalThresholdEl.textContent='🔥 Raus! Es fehlten '+fmtN(threshold-pts)+' bis zur Schwelle ('+fmtN(threshold)+').';
      survivalThresholdEl.classList.add('show'); $('next-btn').textContent='Endstand sehen';
    } else {
      survivalThresholdEl.textContent='✓ Schwelle geschafft! '+fmtN(pts)+' / '+fmtN(threshold)+' Pkt. (+'+(fmtN(pts-threshold))+')';
      survivalThresholdEl.classList.add('show');
    }
  }
  if(S.isVs){ mpOnSubmit(pts); }
  if(S.mode==='survival'){
    showSurvivalScoreReveal(pts,getSurvivalThreshold(S.round),function(){
      show('result-screen'); initResultMap(loc,S.guessLatLng);
      ['stat-dist','stat-pts','stat-total'].forEach(function(id,i){var el=$(id);el.classList.remove('in');setTimeout(function(){el.classList.add('in');},120+i*80);});
      $('res-pts').textContent=fmtN(pts);
      var v=$('score-verdict'); v.textContent=verdict(pts); v.classList.add('in');
    });
    return;
  }
  show('result-screen'); initResultMap(loc,S.guessLatLng);
  ['stat-dist','stat-pts','stat-total'].forEach(function(id,i){var el=$(id);el.classList.remove('in');setTimeout(function(){el.classList.add('in');},120+i*80);});
  setTimeout(function(){
    countUp($('res-pts'),pts,900,function(){
      playScoreSfx(pts);
      var v=$('score-verdict'); v.textContent=verdict(pts); v.classList.add('in');
      if(!S.isVs)updateVsStrip();
      if(S.mode==='survival'&&S.survivalEliminated)setTimeout(function(){sfx.eliminated();},300);
    });
  },350);
  if(S.mode==='daily'){
    markDailyPlayedLocally(S.dailyKey);
    updateDailyPlayAvailability();
    if(S.isLoggedIn&&!S.hasSavedThisRun){
      S.pendingSaveTarget='daily';
      autoSaveLoggedInUser();
    }
  }
  afterGuessExtras(loc.id);
}

function initResultMap(loc,guess){
  $('result-screen').classList.toggle('mp-mode',!!S.isVs); // Mehrspieler: nur Solo-Elemente ausblenden, Ergebnis-Panel behalten
  if(S.resultMap){S.resultMap.remove();S.resultMap=null;}
  var actual=getActualLatLng(loc);
  S.resultMap=L.map('result-map-el',{center:[(actual.lat+guess.lat)/2,(actual.lng+guess.lng)/2],zoom:14,zoomControl:true,attributionControl:false});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(S.resultMap);
  L.circleMarker([actual.lat,actual.lng],{radius:11,color:'#4a8c62',fillColor:'#4a8c62',fillOpacity:1,weight:2}).addTo(S.resultMap).bindTooltip('Tatsächlich',{permanent:true,direction:'top'});
  L.circleMarker([guess.lat,guess.lng],{radius:9,color:'#c9a84c',fillColor:'#c9a84c',fillOpacity:1,weight:2}).addTo(S.resultMap).bindTooltip('Dein Tipp',{permanent:true,direction:'top'});
  L.polyline([[actual.lat,actual.lng],[guess.lat,guess.lng]],{color:'#c9a84c',dashArray:'5 4',weight:2,opacity:.65}).addTo(S.resultMap);
  S.resultMap.fitBounds(L.latLngBounds([[actual.lat,actual.lng],[guess.lat,guess.lng]]).pad(.5));
}

function nextRound(){
  // nextRound kann mehrfach fast gleichzeitig kommen, doppelte Aufrufe verwerfen
  var _now=Date.now();
  if(_now-(S._lastNextRoundAt||0)<1200)return;
  S._lastNextRoundAt=_now;
  vsLog('nextRound → Runde '+(S.round+2)+'/'+S.roundsTotal);
  sfx.next(); clearNextVoteTimers(); hideVsWaitOverlay(); stopSpectatePoll();
  $('vs-bottom-wait').classList.remove('show');
  // Inline-Difficulty-Rating für nächste Runde zurücksetzen
  var inlineRating=document.getElementById('inline-diff-rating');
  if(inlineRating){inlineRating.style.display='none';inlineRating.innerHTML='<div class="inline-diff-label">Wie schwer war der Spot?</div><div class="inline-diff-stars"><button class="diff-star" data-r="1" onclick="submitDifficultyRating(1)">&#9733;</button><button class="diff-star" data-r="2" onclick="submitDifficultyRating(2)">&#9733;</button><button class="diff-star" data-r="3" onclick="submitDifficultyRating(3)">&#9733;</button><button class="diff-star" data-r="4" onclick="submitDifficultyRating(4)">&#9733;</button><button class="diff-star" data-r="5" onclick="submitDifficultyRating(5)">&#9733;</button></div>';}
  // Difficulty-Badge bleibt sichtbar; loadRound() setzt ihn auf 'Unbestimmt' und lädt neu
  var diffBadge=document.getElementById('top-bar-diff');
  if(diffBadge){diffBadge.textContent='';diffBadge.style.display='none';}
  if(S.mode==='survival'&&S.survivalEliminated){showSurvivalFail();return;}
  S.round++;
  if(S.round>=S.roundsTotal)showFinal();
  else{show('game-screen');loadRound();}
}

function showSurvivalFail(){
  var r=S.round;
  var threshold=getSurvivalThreshold(r);
  var lastPts=S.roundScores.length>r?S.roundScores[r].pts:0;
  var deficit=Math.max(0,threshold-lastPts);
  $('sf-round-label').textContent='Du bist in Runde '+(r+1)+' rausgeflogen.';
  $('sf-score-label').textContent=fmtN(S.score)+' Punkte gesamt';
  $('sf-pts-label').textContent='Bestanden: '+r+' / '+SURVIVAL_ROUNDS+(deficit?' · Fehlten: '+fmtN(deficit)+' Pkt.':'');
  $('survival-fail-overlay').classList.add('show');
}

function showFinal(){
  sfx.final(S.score); show('final-screen'); $('final-score-num').textContent='0';
  var modeLabel={daily:'Tägliche Challenge beendet',survival:'🔥 Hitzewelle bestanden!',solo:'Spiel beendet',vs:'Spiel beendet'};
  $('final-title').textContent=modeLabel[S.mode]||'Spiel beendet';
  var maxPossible=S.roundsTotal*MAX_PTS;
  $('final-sub-label').textContent=S.mode==='daily'?'/ 5 000 Punkte':'/ '+fmtN(maxPossible)+' Punkte';
  $('vs-result-box').classList.remove('show');
  S.myPlayAgainVoted=false; S.playAgainVotes=0;
  $('play-again-vote').style.display='none'; $('play-again-vote').textContent='';
  $('play-again-btn').disabled=false; $('play-again-btn').textContent='Nochmal';
  $('play-again-btn').style.display=S.mode==='daily'?'none':'';
  $('share-btn').style.display='block'; resetScoreSavedUI();
  if(S.mode==='survival')launchConfetti(120);
  hideRankPanel();
  var soloRanked=(S.mode==='solo'&&S.isLoggedIn&&!S.isVs);
  setTimeout(function(){
    if(soloRanked){
      // Highscore wird kontoabhängig im Rang-Panel geprüft (kein false-positive mehr)
      countUp($('final-score-num'),S.score,1200);
      showRankPanelAndCelebrate();
      return;
    }
    var hsKey='wg_hs_'+S.mode,prevHs=0;
    try{prevHs=parseInt(localStorage.getItem(hsKey)||'0');}catch(e){}
    var isNewHs=(S.score>0&&S.score>prevHs&&!S.isVs&&S.mode!=='daily');
    if(isNewHs){try{localStorage.setItem(hsKey,String(S.score));}catch(e){}}
    countUp($('final-score-num'),S.score,1200,function(){
      if(isNewHs){triggerHighscoreCelebration();}
    });
  },300);
  var bd=$('final-breakdown'); bd.innerHTML='';
  S.roundScores.forEach(function(r,i){
    var threshold=S.mode==='survival'?getSurvivalThreshold(i):null;
    var failed=S.mode==='survival'&&r.pts<threshold;
    var row=document.createElement('div');
    row.className='final-row'+(failed?' survival-fail-row':'');
    var thresholdHint=threshold?' (min. '+fmtN(threshold)+')':'';
    row.innerHTML='<span>Runde '+r.round+' · '+fmtD(r.dist)+thresholdHint+'</span><span>'+fmtN(r.pts)+' Pkt.</span>';
    bd.appendChild(row);
    setTimeout(function(el){return function(){el.classList.add('in');};}(row),400+i*100);
  });
  if(S.isVs)mpShowFinal();
  if(S.mode==='daily')updateStreak(S.dailyKey);
  if(S.isLoggedIn&&!S.hasSavedThisRun&&!soloRanked&&!S.isVs){
    // soloRanked speichert erst im Rang-Panel; Mehrspieler-Punkte gehören NICHT in die Solo-Bestenliste
    S.pendingSaveTarget=S.mode==='daily'?'daily':'global';
    setTimeout(function(){autoSaveLoggedInUser();},800);
  }
  updateSaveBtnVisibility();
  setTimeout(afterFinalExtras,500);
}

// ── End-of-round Rang-Panel (Solo, eingeloggt) ──
function playRattle(dur,from,to){
  if(typeof VOL!=='undefined'&&VOL===0)return;
  dur=dur||0.7;
  var n=Math.max(8,Math.round(dur/0.026));
  for(var i=0;i<n;i++){
    var p=i/n;
    // mechanisches "drrr": kurze Klicks, steigende Tonhöhe
    tone(340+p*240+(Math.random()*30-15),'square',0.015,0.04*(0.55+0.45*(1-p)),0,i*(dur/n));
  }
}
function rankCountUp(el,from,to,dur,onDone){
  dur=dur||1000;
  if(to<=from){el.textContent=fmtN(to);onDone&&onDone();return;}
  playRattle(dur/1000);
  var start=performance.now();
  (function f(now){
    var t=Math.min((now-start)/dur,1),e=1-Math.pow(1-t,3),cur=Math.round(from+e*(to-from));
    el.textContent=fmtN(cur);
    t<1?requestAnimationFrame(f):(el.textContent=fmtN(to),onDone&&onDone());
  })(performance.now());
}
function triggerHighscoreCelebration(){
  launchConfetti(130); if(sfx&&sfx.amazing)sfx.amazing();
  var b=$('new-highscore-banner'); if(b){b.classList.add('show');setTimeout(function(){b.classList.remove('show');},4000);}
}
function rankMedal(rank){return rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank;}
function buildRankSlot(entry,rank,opts){
  opts=opts||{};
  var div=document.createElement('div');
  div.className='rank-slot'+(opts.me?' me':'')+(rank<=3?' podium':'');
  div.setAttribute('data-rank',rank);
  var ptsShown=(opts.me&&typeof opts.startPts==='number')?opts.startPts:entry.score;
  div.innerHTML='<span class="rank-num">'+rankMedal(rank)+'</span>'
    +'<span class="rank-name">'+escHtml(entry.name)+(opts.me?'<span class="rank-you">DU</span>':'')+'</span>'
    +'<span class="rank-pts">'+fmtN(ptsShown)+'</span>';
  return div;
}

function hideRankPanel(){var p=$('rank-panel');if(p)p.classList.remove('show','animating');}

async function showRankPanelAndCelebrate(){
  var panel=$('rank-panel'); if(!panel)return;
  var meKey=(S.loggedInName||'').toLowerCase(); if(!meKey)return;
  var rowsEl=panel.querySelector('.rank-rows'),jumpEl=panel.querySelector('.rank-jump'),noteEl=panel.querySelector('.rank-note');
  rowsEl.innerHTML=''; jumpEl.innerHTML=''; jumpEl.classList.remove('show'); noteEl.textContent=''; noteEl.classList.remove('show');
  panel.classList.remove('show','animating');

  var rows;
  try{ rows=await sbFetch('wels_scores?select=name,score&order=score.desc&limit=500'); }
  catch(e){ rows=null; }
  // Lauf speichern, Stand wurde oben schon erfasst
  if(!S.hasSavedThisRun){ S.pendingSaveTarget='global'; autoSaveLoggedInUser(); }
  if(!rows){ return; }

  var best={};
  rows.forEach(function(r){ if(!r.name)return; var k=r.name.toLowerCase(); if(!best[k]||r.score>best[k].score)best[k]={name:r.name,score:r.score}; });
  var myOldBest=best[meKey]?best[meKey].score:0;
  var oldArr=Object.keys(best).map(function(k){return best[k];}).sort(function(a,b){return b.score-a.score;});
  var oldIdx=-1; for(var i=0;i<oldArr.length;i++){ if(oldArr[i].name.toLowerCase()===meKey){oldIdx=i;break;} }
  var oldRank=oldIdx<0?oldArr.length+1:oldIdx+1;

  var newScore=S.score, newBest=Math.max(myOldBest,newScore), isNewHs=newScore>myOldBest;
  if(isNewHs){try{localStorage.setItem('wg_hs_'+S.mode,String(newBest));}catch(e){}}

  var nb={}; Object.keys(best).forEach(function(k){ nb[k]={name:best[k].name,score:best[k].score}; });
  nb[meKey]={name:S.loggedInName,score:newBest};
  var newArr=Object.keys(nb).map(function(k){return nb[k];}).sort(function(a,b){return b.score-a.score;});
  var newIdx=0; for(var j=0;j<newArr.length;j++){ if(newArr[j].name.toLowerCase()===meKey){newIdx=j;break;} }
  var newRank=newIdx+1;
  var overtaken=Math.max(0,oldRank-newRank);

  // sichtbare Reihen aufbauen
  var aboveEntry=newArr[newIdx-1]||null;
  var meEntry=newArr[newIdx];
  var maxBelow=overtaken>0?Math.min(overtaken,3):1;
  var belowEntries=newArr.slice(newIdx+1,newIdx+1+maxBelow);

  var aboveSlot=aboveEntry?buildRankSlot(aboveEntry,newRank-1,{}):null;
  var meSlot=buildRankSlot(meEntry,newRank,{me:true,startPts:isNewHs?myOldBest:newBest});
  var belowSlots=belowEntries.map(function(e,k){return buildRankSlot(e,newRank+1+k,{});});

  if(aboveSlot)rowsEl.appendChild(aboveSlot);
  rowsEl.appendChild(meSlot);
  belowSlots.forEach(function(s){rowsEl.appendChild(s);});

  // Panel einblenden, setTimeout läuft auch bei inaktivem Tab
  setTimeout(function(){panel.classList.add('show');},30);

  var doOvertake=isNewHs&&overtaken>0&&belowSlots.length>0;
  var mePtsEl=meSlot.querySelector('.rank-pts');
  // Namen der überholten Spieler (alte Plätze newRank..oldRank-1)
  var overtakenNames=oldArr.slice(newRank-1,oldRank-1).map(function(e){return e.name;});
  function buildOvertakeText(names){
    if(!names.length)return '';
    if(names.length===1)return 'Du hast <b>'+escHtml(names[0])+'</b> überholt!';
    if(names.length===2)return 'Du hast <b>'+escHtml(names[0])+'</b> und <b>'+escHtml(names[1])+'</b> überholt!!';
    return 'Du hast <b>'+escHtml(names[0])+'</b>, <b>'+escHtml(names[1])+'</b> und <b>'+(names.length-2)+' weitere</b> überholt!!';
  }

  function runCountAndCelebrate(){
    if(isNewHs){
      meSlot.classList.add('hs');
      rankCountUp(mePtsEl,myOldBest,newBest,Math.min(1600,700+Math.abs(newBest-myOldBest)/8),function(){
        setTimeout(triggerHighscoreCelebration,120);
      });
    }
    if(overtaken>0){
      jumpEl.innerHTML='<span class="rank-jump-from">#'+oldRank+'</span><span class="rank-jump-arrow">→</span><span class="rank-jump-to">#'+newRank+'</span>';
      setTimeout(function(){jumpEl.classList.add('show');},isNewHs?450:200);
      var ot=$('rank-panel').querySelector('.rank-overtake');
      if(ot&&overtakenNames.length){ot.innerHTML=buildOvertakeText(overtakenNames);setTimeout(function(){ot.classList.add('show');},isNewHs?1050:700);}
    } else if(isNewHs){
      noteEl.textContent='Neuer persönlicher Rekord · Platz '+newRank;
      setTimeout(function(){noteEl.classList.add('show');},400);
    } else {
      noteEl.textContent='Diese Runde: '+fmtN(newScore)+' · Dein Rekord: '+fmtN(newBest);
      setTimeout(function(){noteEl.classList.add('show');},300);
    }
  }

  if(doOvertake){
    // FLIP: "Du" wird unten aufgenommen, gedreht, und langsam nach oben einsortiert;
    // überholte Slots werden sichtbar nach unten geschoben
    var rh=meSlot.getBoundingClientRect().height+8;
    meSlot.classList.add('lifting');
    meSlot.style.transform='translate(10px,'+(belowSlots.length*rh)+'px) rotate(-5deg) scale(1.06)';
    belowSlots.forEach(function(s){s.style.transform='translateY('+(-rh)+'px)';});
    // länger "aufgenommen" halten, damit man den Sprung sieht, dann gemächlich einsortieren
    setTimeout(function(){
      panel.classList.add('animating');
      meSlot.classList.add('dropping');
      meSlot.style.transform='';
      belowSlots.forEach(function(s){s.classList.add('pushed');s.style.transform='';});
      setTimeout(function(){meSlot.classList.remove('lifting','dropping');runCountAndCelebrate();},1150);
    },780);
  } else {
    runCountAndCelebrate();
  }
}

// ── Share ──
function shareResult(){
  var canvas=$('share-canvas'),ctx=canvas.getContext('2d'),W=1080,H=540;
  canvas.width=W; canvas.height=H;
  var grad=ctx.createLinearGradient(0,0,W,H);
  if(S.mode==='survival'){
    grad.addColorStop(0,'#1a0500');grad.addColorStop(0.5,'#3d1000');grad.addColorStop(1,'#1a0800');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    var rg=ctx.createRadialGradient(W/2,H,0,W/2,H,H*0.9);
    rg.addColorStop(0,'rgba(224,92,42,0.45)');rg.addColorStop(1,'transparent');
    ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
  } else if(S.mode==='daily'){
    grad.addColorStop(0,'#0d1a2e');grad.addColorStop(0.5,'#142238');grad.addColorStop(1,'#0a1520');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.fillStyle='rgba(255,255,255,0.65)';
    for(var _si=0;_si<60;_si++){var _sx=Math.random()*W,_sy=Math.random()*H*0.65,_sr=0.5+Math.random()*1.5;ctx.beginPath();ctx.arc(_sx,_sy,_sr,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  } else {
    grad.addColorStop(0,'#13271a');grad.addColorStop(0.5,'#1a3322');grad.addColorStop(1,'#17311f');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=0.08;
    ctx.fillStyle='#c9a84c';ctx.beginPath();ctx.arc(W*0.85,H*0.2,180,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#4a8c62';ctx.beginPath();ctx.arc(W*0.12,H*0.8,140,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle='rgba(201,168,76,0.35)';ctx.lineWidth=2;ctx.strokeRect(20,20,W-40,H-40);
  ctx.fillStyle='rgba(245,240,232,0.5)';ctx.font='500 22px "DM Mono", monospace';ctx.fillText('WELSGUESSR',60,80);
  var modeLabels={solo:'Einzelspieler',vs:'1v1',daily:'Tägliche Challenge',survival:'🔥 Hitzewelle'};
  ctx.fillStyle='rgba(201,168,76,0.7)';ctx.font='18px "DM Mono", monospace';ctx.fillText(modeLabels[S.mode]||'',60,120);
  ctx.fillStyle='#c9a84c';ctx.font='bold 140px "Playfair Display", serif';ctx.fillText(fmtN(S.score),60,290);
  ctx.fillStyle='rgba(245,240,232,0.45)';ctx.font='22px "DM Mono", monospace';ctx.fillText('/ '+fmtN(S.roundsTotal*MAX_PTS)+' Punkte',60,340);
  ctx.fillStyle='rgba(143,168,154,0.7)';ctx.font='16px "DM Mono", monospace';
  S.roundScores.forEach(function(r,i){
    if(i<5){var failed=S.mode==='survival'&&r.pts<getSurvivalThreshold(i);ctx.fillStyle=failed?'rgba(224,92,42,0.7)':'rgba(143,168,154,0.7)';ctx.fillText('R'+r.round+' · '+fmtD(r.dist)+' · '+fmtN(r.pts)+' Pkt.',60,390+i*26);}
  });
  ctx.fillStyle='rgba(143,168,154,0.45)';ctx.font='15px "DM Mono", monospace';ctx.textAlign='right';ctx.fillText(getViennaDisplayDate(getViennaDateKey()),W-60,H-40);ctx.textAlign='left';
  canvas.toBlob(function(blob){
    if(!blob)return;
    var file=new File([blob],'welsuessr-ergebnis.png',{type:'image/png'});
    var shareData={title:'WelsGuessr Ergebnis',text:'Ich habe '+fmtN(S.score)+' Punkte bei WelsGuessr! 🌍 Kannst du das toppen?',files:[file]};
    if(navigator.share&&navigator.canShare&&navigator.canShare(shareData)){navigator.share(shareData).catch(function(err){if(err&&err.name!=='AbortError')downloadShareImage(canvas);});}
    else downloadShareImage(canvas);
  },'image/png');
}
function downloadShareImage(canvas){var a=document.createElement('a');a.download='welsuessr-ergebnis.png';a.href=canvas.toDataURL('image/png');a.click();}

// ── Leaderboard ──
var lbAdminMode=false,lbLKeyCount=0,lbLKeyTimer=null;
document.addEventListener('keydown',function(e){
  if((e.key==='l'||e.key==='L')&&$('lb-modal').classList.contains('open')){
    lbLKeyCount++;clearTimeout(lbLKeyTimer);lbLKeyTimer=setTimeout(function(){lbLKeyCount=0;},2500);
    if(lbLKeyCount>=5){lbLKeyCount=0;openAdminFromLb();}
  }
});
function openAdminFromLb(){closeModal('lb-modal');openModal('admin-modal');setTimeout(function(){$('admin-pw').focus();},300);}
function checkAdminPw(){
  if($('admin-pw').value==='0907'){
    lbAdminMode=true;$('admin-pw').value='';closeModal('admin-modal');openLeaderboard();$('lb-admin-hint').textContent='Admin-Modus aktiv';
  } else {$('admin-error').textContent='Falsches Passwort.';}
}
function setLeaderboardTab(tab){
  S.leaderboardTab=tab;['week','month','all'].forEach(function(t){$('lb-tab-'+t).classList.toggle('active',t===tab);});loadLeaderboardData();
}
function setLbSort(sort){
  S.lbSort=sort;$('lb-sort-pts').classList.toggle('active',sort==='pts');$('lb-sort-date').classList.toggle('active',sort==='date');loadLeaderboardData();
}
function openLeaderboard(){openModal('lb-modal');loadLeaderboardData();}

// ── Gesamtpunkte-Zähler (Startseite, alle 10s) + Details/Meilenstein ──
var _tpVal=0,_tpAnim=null,_tpStats=null;
async function loadTotalPoints(){
  var el=$('total-points-num');
  try{
    var s=await sbFetch('rpc/wels_points_stats');
    if(Array.isArray(s))s=s[0];
    if(s&&s.wels_points_stats)s=s.wels_points_stats;
    _tpStats=s||{};
    var total=parseInt(_tpStats.total,10)||0;
    if(el){ animateTotalPoints(el,_tpVal,total); _tpVal=total; }
    renderMilestoneLine();
    if($('total-points-modal')&&$('total-points-modal').classList.contains('open'))renderTotalPointsModal();
  }catch(e){}
}
function renderMilestoneLine(){
  var ml=$('total-points-milestone'); if(!ml)return;
  var m=parseInt((_tpStats&&_tpStats.milestone)||'',10)||0;
  if(m>0){ var pct=Math.min(100,Math.round(_tpVal/m*100)); ml.style.display=''; ml.textContent='🎯 Meilenstein '+fmtN(m)+' · '+pct+'%'; }
  else ml.style.display='none';
}
function openTotalPointsDetails(){ openModal('total-points-modal'); renderTotalPointsModal(); loadTotalPoints(); }
function renderTotalPointsModal(){
  var s=_tpStats||{};
  var total=parseInt(s.total,10)||0, today=parseInt(s.today,10)||0;
  var t1=$('tpd-total'); if(t1)t1.textContent=fmtN(total);
  var t2=$('tpd-today'); if(t2)t2.textContent=fmtN(today);
  var tp=$('tpd-top'); if(tp)tp.textContent=s.top_name?(s.top_name+' · '+fmtN(parseInt(s.top_points,10)||0)):'—';
  var m=parseInt(s.milestone,10)||0, wrap=$('tpd-milestone-wrap');
  if(m>0){ var pct=Math.min(100,total/m*100); var lbl=$('tpd-milestone-label'); if(lbl)lbl.textContent='Meilenstein: '+fmtN(m)+' für nächstes Update ('+Math.round(pct)+'%)'; var bar=$('tpd-milestone-bar'); if(bar)bar.style.width=pct+'%'; if(wrap)wrap.style.display=''; }
  else if(wrap)wrap.style.display='none';
  var adm=$('tpd-admin'); if(adm)adm.style.display=(typeof lbAdminMode!=='undefined'&&lbAdminMode)?'':'none';
  var inp=$('tpd-milestone-input'); if(inp&&document.activeElement!==inp)inp.value=m>0?m:'';
}
async function saveMilestone(){
  var inp=$('tpd-milestone-input'); if(!inp)return;
  var v=parseInt((inp.value||'').replace(/[^\d]/g,''),10)||0;
  var btn=$('tpd-save-btn'); if(btn){btn.disabled=true;btn.textContent='…';}
  try{ await sbFetch('wels_config?key=eq.milestone','PATCH',{value:String(v)}); }catch(e){}
  if(btn){btn.disabled=false;btn.textContent='Setzen';}
  await loadTotalPoints(); renderTotalPointsModal();
  try{tone(660,'sine',.1,.08);}catch(e){}
}
function animateTotalPoints(el,from,to){
  if(from===to){el.textContent=fmtN(to);return;}
  if(_tpAnim)cancelAnimationFrame(_tpAnim);
  var dur=900,t0=performance.now();
  function step(now){
    var p=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-p,3);
    el.textContent=fmtN(Math.round(from+(to-from)*e));
    if(p<1)_tpAnim=requestAnimationFrame(step);
  }
  _tpAnim=requestAnimationFrame(step);
}

var lbExpandedNames={},lbSubSort={};

async function loadLeaderboardData(){
  $('lb-list').innerHTML='<div style="font-size:.7rem;color:var(--mist);text-align:center;padding:1rem">Lade…</div>';
  try{
    var path='wels_scores?select=id,name,score,created_at';
    if(S.leaderboardTab==='week') path+='&created_at=gte.'+getWeekStartKeyVienna()+'T00:00:00';
    else if(S.leaderboardTab==='month'){var p=getViennaParts();path+='&created_at=gte.'+p.year+'-'+String(p.month).padStart(2,'0')+'-01T00:00:00';}
    path+='&order=score.desc&limit=200';
    var rows=await sbFetch(path);
    if(!rows||rows.length===0){$('lb-list').innerHTML='<div style="font-size:.7rem;color:var(--mist);text-align:center;padding:1rem">Noch keine Einträge.</div>';return;}
    $('lb-list').innerHTML='';
    lbAdminMode?$('lb-list').classList.add('admin-mode'):$('lb-list').classList.remove('admin-mode');
    var playerBest={},playerAll={};
    rows.forEach(function(r){
      if(!r.name)return;var key=r.name.toLowerCase();
      if(!playerBest[key]){playerBest[key]=r;playerAll[key]=[];}
      playerAll[key].push(r);if(r.score>playerBest[key].score)playerBest[key]=r;
    });
    // Fetch real names + Avatare for all players
    var playerRealNames={},playerAvatars={};
    try{
      var uniqueNames=Object.keys(playerBest).map(function(k){return playerBest[k].name;});
      var nameList=uniqueNames.map(function(n){return '"'+n+'"';}).join(',');
      var playerInfoRows=await sbFetch('players?select=name,vorname,nachname,avatar_url&name=in.('+nameList+')');
      if(playerInfoRows)playerInfoRows.forEach(function(p){
        if(p.vorname)playerRealNames[p.name.toLowerCase()]=p.vorname+(p.nachname?' '+p.nachname:'');
        if(p.avatar_url)playerAvatars[p.name.toLowerCase()]=p.avatar_url;
      });
    }catch(e){}
    var players=Object.keys(playerBest).map(function(k){return playerBest[k];});
    if(S.lbSort==='date')players.sort(function(a,b){return new Date(b.created_at)-new Date(a.created_at);});
    else players.sort(function(a,b){return b.score-a.score;});
    players=players.slice(0,50);
    if(!players.length){$('lb-list').innerHTML='<div style="font-size:.7rem;color:var(--mist);text-align:center;padding:1rem">Noch keine Einträge.</div>';return;}
    var medals=['🥇','🥈','🥉'];
    players.forEach(function(r,i){
      var nameKey=r.name.toLowerCase(),allScores=playerAll[nameKey]||[];
      var rankLabel=(S.lbSort==='pts'&&i<3)?'<span class="lb-rank gold">'+medals[i]+'</span>':'<span class="lb-rank">'+(i+1)+'</span>';
      var d=new Date(r.created_at),date=fmtDate(d),timeStr=d.toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit'});
      var multiHint=allScores.length>1?' <span style="font-size:.55rem;color:var(--mist);">('+allScores.length+')</span>':'';
      var realName=playerRealNames[nameKey]||'';
      var nameAttr=realName?' data-realname="'+escHtml(realName)+'"':'';
      var rowEl=document.createElement('div');rowEl.className='lb-row';
      var profBtn='<button class="lb-profile-btn" onclick="event.stopPropagation();openProfile(\''+escHtml(r.name)+'\')">👤</button>';
      var _av=playerAvatars[nameKey];
      var avHtml='<span class="lb-avatar'+(_av?' has':'')+'"'+(_av?' style="background-image:url(\''+_av+'\')"':'')+'>'+(_av?'':escHtml(r.name.charAt(0).toUpperCase()))+'</span>';
      rowEl.innerHTML=rankLabel+avHtml+'<span class="lb-name"'+nameAttr+'>'+escHtml(r.name)+multiHint+'</span><span class="lb-score">'+fmtN(r.score)+'</span><span class="lb-date" data-time="'+timeStr+'">'+date+'</span>'+profBtn;
      if(realName){
        (function(nameEl,spitz,hint,full){
          if(IS_TOUCH){
            nameEl.classList.add('lb-name-tappable');
            nameEl.addEventListener('click',function(ev){
              ev.stopPropagation();
              var shown=nameEl.classList.contains('lb-realname-shown');
              if(shown){nameEl.innerHTML=spitz+hint;nameEl.classList.remove('lb-realname-shown');}
              else{nameEl.innerHTML=escHtml(full);nameEl.classList.add('lb-realname-shown');}
            });
          } else {
            nameEl.addEventListener('mouseenter',function(){nameEl.innerHTML=escHtml(full);nameEl.classList.add('lb-realname-shown');});
            nameEl.addEventListener('mouseleave',function(){nameEl.innerHTML=spitz+hint;nameEl.classList.remove('lb-realname-shown');});
          }
        })(rowEl.querySelector('.lb-name'),escHtml(r.name),multiHint,realName);
      }
      if(IS_TOUCH){
        (function(dateEl,dStr,tStr){
          if(!dateEl||!tStr)return;
          dateEl.addEventListener('click',function(ev){ev.stopPropagation();dateEl.textContent=(dateEl.textContent===tStr)?dStr:tStr;});
        })(rowEl.querySelector('.lb-date'),date,timeStr);
      }
      if(lbAdminMode){
        var rn=r.name;
        var renameBtn=document.createElement('button');renameBtn.className='lb-rename';renameBtn.textContent='✏️';
        renameBtn.onclick=(function(n){return function(e){e.stopPropagation();openAdminEditPlayer(n);};})(rn);
        rowEl.appendChild(renameBtn);
        var addBtn=document.createElement('button');addBtn.className='lb-add-entry';addBtn.textContent='+';
        addBtn.onclick=(function(n){return function(e){e.stopPropagation();openAdminAddEntry(n);};})(rn);
        rowEl.appendChild(addBtn);
        var delBtn=document.createElement('button');delBtn.className='lb-del';delBtn.textContent='✕';delBtn.setAttribute('data-id',r.id);
        delBtn.onclick=function(e){e.stopPropagation();deleteLbEntry(this.getAttribute('data-id'),this.parentElement);};
        rowEl.appendChild(delBtn);
      }
      var subList=document.createElement('div');subList.className='lb-player-scores';
      if(lbExpandedNames[nameKey])subList.classList.add('open');
      if(allScores.length>1){
        var curSubSort=lbSubSort[nameKey]||(S.lbSort==='date'?'date':'pts');
        var sortRow=document.createElement('div');sortRow.className='lb-sub-sort-row';
        sortRow.innerHTML='<button class="lb-sub-sort-btn'+(curSubSort==='pts'?' active':'')+'" data-player="'+nameKey+'" data-sort="pts">◆ Punkte</button><button class="lb-sub-sort-btn'+(curSubSort==='date'?' active':'')+'" data-player="'+nameKey+'" data-sort="date">📅 Datum</button>';
        sortRow.querySelectorAll('.lb-sub-sort-btn').forEach(function(btn){
          btn.onclick=function(e){
            e.stopPropagation();var player=btn.getAttribute('data-player'),sortVal=btn.getAttribute('data-sort');
            lbSubSort[player]=sortVal;renderSubScores(subList,playerAll[player],sortVal);
            sortRow.querySelectorAll('.lb-sub-sort-btn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-sort')===sortVal);});
            tone(sortVal==='pts'?660:440,'sine',.06,.07);
          };
        });
        subList.appendChild(sortRow);renderSubScores(subList,allScores,curSubSort);
        rowEl.onclick=function(e){
          if(e.target.classList.contains('lb-profile-btn')||e.target.classList.contains('lb-del')||e.target.classList.contains('lb-rename')||e.target.classList.contains('lb-add-entry'))return;
          var isOpen=subList.classList.contains('open');
          subList.classList.toggle('open',!isOpen);lbExpandedNames[nameKey]=!isOpen;tone(isOpen?440:660,'sine',.06,.07);
        };
      }
      $('lb-list').appendChild(rowEl);
      $('lb-list').appendChild(subList);
      setTimeout(function(){rowEl.classList.add('in');},i*45);
    });
  }catch(e){$('lb-list').innerHTML='<div style="font-size:.7rem;color:#e8826a;text-align:center;padding:1rem">Fehler beim Laden.</div>';console.error('Leaderboard error:',e);}
}

function renderSubScores(container,scores,sortMode){
  Array.from(container.querySelectorAll('.lb-sub-score')).forEach(function(el){el.remove();});
  var sorted=scores.slice();
  if(sortMode==='date')sorted.sort(function(a,b){return new Date(b.created_at)-new Date(a.created_at);});
  else sorted.sort(function(a,b){return b.score-a.score;});
  sorted.forEach(function(sc){
    var sd=new Date(sc.created_at),sdate=fmtDate(sd),stime=sd.toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit'});
    var sub=document.createElement('div');sub.className='lb-sub-score';
    sub.innerHTML='<span>'+sdate+' '+stime+'</span><span>'+fmtN(sc.score)+'</span><button class="lb-profile-btn" onclick="event.stopPropagation();openProfile(\''+escHtml(sc.name||'')+'\')">👤</button>';
    if(lbAdminMode){
      var delSubBtn=document.createElement('button');delSubBtn.className='lb-del lb-del-sub';delSubBtn.textContent='\u2715';delSubBtn.setAttribute('data-id',sc.id);
      delSubBtn.onclick=function(e){e.stopPropagation();deleteLbEntry(this.getAttribute('data-id'),this.closest('.lb-sub-score'),true);};
      sub.appendChild(delSubBtn);
    }
    container.appendChild(sub);
  });
}

async function deleteLbEntry(id,wrap,isSub){
  try{
    var res=await sbFetch('wels_scores?id=eq.'+id,'DELETE');
    if(!res||!res.length){alert('Löschen fehlgeschlagen (keine Berechtigung?). DELETE-Richtlinie (RLS) in Supabase prüfen.');return;}
    tone(300,'sawtooth',.1,.06);
    if(isSub){if(wrap)wrap.remove();loadLeaderboardData();}else{if(wrap)wrap.remove();}
  }catch(e){alert('Fehler beim Löschen: '+(e&&e.message?e.message:JSON.stringify(e)));}
}

var _adminEditOldName='';
function openAdminEditPlayer(playerName){
  _adminEditOldName=playerName;
  $('admin-edit-player-label').textContent='Spieler: '+playerName;
  $('admin-edit-spitzname').value=playerName;
  $('admin-edit-vorname').value='';$('admin-edit-nachname').value='';
  $('admin-edit-error').textContent='';
  sbFetch('players?name=ilike.'+encodeURIComponent(playerName)+'&select=vorname,nachname')
    .then(function(rows){
      if(rows&&rows.length){
        $('admin-edit-vorname').value=rows[0].vorname||'';
        $('admin-edit-nachname').value=rows[0].nachname||'';
      }
    }).catch(function(){});
  openModal('admin-edit-player-modal');
  setTimeout(function(){$('admin-edit-spitzname').focus();},200);
}
async function submitAdminEditPlayer(){
  var newName=($('admin-edit-spitzname').value||'').trim();
  var vorname=($('admin-edit-vorname').value||'').trim();
  var nachname=($('admin-edit-nachname').value||'').trim();
  var errEl=$('admin-edit-error');errEl.textContent='';
  if(!newName){errEl.textContent='Spitzname darf nicht leer sein.';return;}
  if(!NAME_REGEX.test(newName)){errEl.textContent='Nur Buchstaben, Zahlen, . - _ erlaubt.';return;}
  var renamed=newName!==_adminEditOldName;
  try{
    // 1) Umbenennen über alle Tabellen
    if(renamed){
      // Doppelten Namen verhindern (eigene Zeile ausnehmen)
      var dup=await sbFetch('players?name=ilike.'+encodeURIComponent(newName)+'&select=name');
      if(dup&&dup.some(function(r){return r.name.toLowerCase()!==_adminEditOldName.toLowerCase();})){errEl.textContent='Name "'+newName+'" ist schon vergeben.';return;}
      var res=await sbFetch('players?name=ilike.'+encodeURIComponent(_adminEditOldName),'PATCH',{name:newName});
      if(!res||!res.length){errEl.textContent='Umbenennen fehlgeschlagen (keine Berechtigung?). SQL-Richtlinien (RLS) prüfen.';return;}
      await sbFetch('wels_scores?name=ilike.'+encodeURIComponent(_adminEditOldName),'PATCH',{name:newName}).catch(function(){});
      await sbFetch('wels_daily_scores?name=ilike.'+encodeURIComponent(_adminEditOldName),'PATCH',{name:newName}).catch(function(){});
      await sbFetch('achievements?player_name=ilike.'+encodeURIComponent(_adminEditOldName),'PATCH',{player_name:newName}).catch(function(){});
      if(S.isLoggedIn&&S.loggedInName&&S.loggedInName.toLowerCase()===_adminEditOldName.toLowerCase()){
        S.loggedInName=newName;saveSession(newName,S.loggedInPwHash);
        var _btn=$('auth-btn');if(_btn)_btn.textContent='Abmelden ('+newName+')';
      }
    }
    // 2) Vor-/Nachname separat (bricht nicht, falls Spalten fehlen)
    try{
      await sbFetch('players?name=ilike.'+encodeURIComponent(newName),'PATCH',{vorname:vorname||null,nachname:nachname||null});
    }catch(_){}
    closeModal('admin-edit-player-modal');tone(660,'sine',.1,.08);
    loadLeaderboardData();
    // Profil aktualisieren, falls offen
    if($('profile-screen')&&$('profile-screen').classList.contains('active'))openProfile(newName);
  }catch(e){errEl.textContent='Fehler: '+(e&&e.message?e.message:JSON.stringify(e));}
}

var _adminAddPlayer='';
function openAdminAddEntry(playerName){
  _adminAddPlayer=playerName;
  $('admin-add-entry-player').textContent='Für: '+playerName;
  $('admin-add-score').value='';
  var now=new Date();
  $('admin-add-date').value=now.toISOString().split('T')[0];
  $('admin-add-time').value=now.toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit'}).replace('.',':');
  $('admin-add-error').textContent='';
  openModal('admin-add-entry-modal');
}
async function submitAdminAddEntry(){
  var score=parseInt($('admin-add-score').value);
  var date=$('admin-add-date').value,time=$('admin-add-time').value;
  if(!_adminAddPlayer){$('admin-add-error').textContent='Kein Spieler.';return;}
  if(isNaN(score)||score<0||score>25000){$('admin-add-error').textContent='Punkte müssen 0 bis 25000 sein.';return;}
  if(!date||!time){$('admin-add-error').textContent='Datum und Uhrzeit angeben.';return;}
  var created_at=date+'T'+time+':00+02:00';
  try{
    await sbFetch('wels_scores','POST',{name:_adminAddPlayer,score:score,created_at:created_at});
    closeModal('admin-add-entry-modal');loadLeaderboardData();tone(660,'sine',.1,.08);
  }catch(e){$('admin-add-error').textContent='Fehler: '+(e&&e.message?e.message:JSON.stringify(e));}
}

// ── Login ──
var loginMode='existing',loginNameCheckTimer=null;
function openLoginModal(){
  loginMode='new';$('login-toggle-no').classList.add('active');$('login-toggle-yes').classList.remove('active');
  $('login-name').value='';$('login-pw').value='';$('login-error').textContent='';$('login-name-avail').textContent='';
  if($('login-vorname'))$('login-vorname').value='';if($('login-nachname'))$('login-nachname').value='';
  if($('login-realname-fields'))$('login-realname-fields').style.display='flex';
  $('login-pw-hint').textContent='Erstellt deinen Account. Merke dir das Passwort!';openModal('login-modal');setTimeout(function(){$('login-name').focus();},200);
}
function setLoginMode(mode){
  loginMode=mode;$('login-toggle-no').classList.toggle('active',mode==='new');$('login-toggle-yes').classList.toggle('active',mode==='existing');
  $('login-name-avail').textContent='';$('login-error').textContent='';
  $('login-pw-hint').textContent=mode==='new'?'Erstellt deinen Account. Merke dir das Passwort!':'Dein bisheriges Passwort.';
  if($('login-realname-fields'))$('login-realname-fields').style.display=mode==='new'?'flex':'none';
}

$('login-name')&&$('login-name').addEventListener('input',function(){
  var name=$('login-name').value.trim();$('login-error').textContent='';
  if(loginMode!=='new'){$('login-name-avail').textContent='';return;}
  if(!name||!NAME_REGEX.test(name)){$('login-name-avail').textContent=name?'Nur Buchstaben, Zahlen, . - _ erlaubt.':'';$('login-name-avail').className='name-avail'+(name?' taken':'');return;}
  clearTimeout(loginNameCheckTimer);$('login-name-avail').textContent='Prüfe…';$('login-name-avail').className='name-avail checking';
  loginNameCheckTimer=setTimeout(async function(){
    try{var rows=await sbFetch('players?name=ilike.'+encodeURIComponent(name)+'&select=id');
      if(rows&&rows.length){$('login-name-avail').textContent='Vergeben.';$('login-name-avail').className='name-avail taken';}
      else{$('login-name-avail').textContent='Verfügbar!';$('login-name-avail').className='name-avail ok';}
    }catch(e){$('login-name-avail').textContent='';}
  },350);
});

async function submitLogin(){
  var name=$('login-name').value.trim(),pw=$('login-pw').value;
  if(!name||!pw){$('login-error').textContent='Bitte Name und Passwort eingeben.';return;}
  if(!NAME_REGEX.test(name)){$('login-error').textContent='Name: nur Buchstaben, Zahlen, . - _ erlaubt.';return;}
  $('login-error').textContent='';$('login-submit-btn').disabled=true;
  try{
    var inputHash=await hashString(pw);
    var existing=await sbFetch('players?name=ilike.'+encodeURIComponent(name)+'&select=id,name,pw_hash');
    if(loginMode==='new'){
      var vorname=($('login-vorname')&&$('login-vorname').value.trim())||'';
      var nachname=($('login-nachname')&&$('login-nachname').value.trim())||'';
      if(!vorname){$('login-error').textContent='Bitte Vorname eingeben.';$('login-submit-btn').disabled=false;return;}
      if(existing&&existing.length){
        if(existing[0].pw_hash===inputHash){saveSession(existing[0].name,inputHash);refreshAuthUI();}
        else{$('login-error').textContent='Name vergeben.';$('login-submit-btn').disabled=false;return;}
      } else {
        await sbFetch('players','POST',{name:name,pw_hash:inputHash,vorname:vorname,nachname:nachname||null});saveSession(name,inputHash);refreshAuthUI();
        if(window.pfPromptForPhoto)setTimeout(pfPromptForPhoto,700);   // neues Konto → Profilbild anbieten
      }
    } else {
      if(!existing||!existing.length){$('login-error').textContent='Account nicht gefunden.';$('login-submit-btn').disabled=false;return;}
      if(existing[0].pw_hash!==inputHash){$('login-error').textContent='Falsches Passwort.';$('login-submit-btn').disabled=false;return;}
      saveSession(existing[0].name,inputHash);refreshAuthUI();
    }
    closeModal('login-modal');tone(660,'sine',.12,.08);tone(880,'sine',.1,.06,0,.08);
    checkNamePromptNeeded();
  }catch(e){$('login-error').textContent='Fehler: '+(e&&e.message?e.message:'Unbekannt');$('login-submit-btn').disabled=false;}
}

async function checkNamePromptNeeded(){
  if(!S.isLoggedIn)return;
  try{
    var rows=await sbFetch('players?name=ilike.'+encodeURIComponent(S.loggedInName)+'&select=vorname');
    if(rows&&rows.length&&!rows[0].vorname){
      $('name-prompt-modal').classList.add('show');
    }
  }catch(e){}
}

async function submitNamePrompt(){
  var vorname=($('name-prompt-vorname')&&$('name-prompt-vorname').value.trim())||'';
  var nachname=($('name-prompt-nachname')&&$('name-prompt-nachname').value.trim())||'';
  if(!vorname){$('name-prompt-error').textContent='Bitte Vorname eingeben.';return;}
  $('name-prompt-submit-btn').disabled=true;
  try{
    await sbFetch('players?name=ilike.'+encodeURIComponent(S.loggedInName),'PATCH',{vorname:vorname,nachname:nachname||null});
    $('name-prompt-modal').classList.remove('show');
    tone(660,'sine',.12,.08);
  }catch(e){$('name-prompt-error').textContent='Fehler beim Speichern.';$('name-prompt-submit-btn').disabled=false;}
}

// ── Score speichern ──
var nameCheckTimer=null,saveMode='';
function setSaveMode(mode){
  saveMode=mode==='existing'?'existing':'new';
  $('toggle-no').classList.toggle('active',saveMode==='new');$('toggle-yes').classList.toggle('active',saveMode==='existing');
  $('save-step-2').style.display='flex';$('save-error').textContent='';
  $('name-avail-hint').textContent='';$('name-avail-hint').className='name-avail';$('save-name').value='';$('save-pw').value='';
  if(saveMode==='new'){$('save-pw-hint').textContent='Erstellt deinen Account. Merke dir das Passwort!';$('save-name').readOnly=false;}
  else{$('save-pw-hint').textContent='Dein bisheriges Passwort.';$('save-name').readOnly=false;var session=loadSession();if(session.name)$('save-name').value=session.name;}
  setTimeout(function(){$('save-name').focus();},80);
}

$('save-name')&&$('save-name').addEventListener('input',function(){
  var name=$('save-name').value.trim();$('save-error').textContent='';
  if(saveMode!=='new'){$('name-avail-hint').textContent='';$('name-avail-hint').className='name-avail';return;}
  if(!name){$('name-avail-hint').textContent='';$('name-avail-hint').className='name-avail';return;}
  if(!NAME_REGEX.test(name)){$('name-avail-hint').textContent='Nur Buchstaben, Zahlen, . - _ erlaubt.';$('name-avail-hint').className='name-avail taken';return;}
  clearTimeout(nameCheckTimer);$('name-avail-hint').textContent='Prüfe…';$('name-avail-hint').className='name-avail checking';
  nameCheckTimer=setTimeout(async function(){
    try{var rows=await sbFetch('players?name=ilike.'+encodeURIComponent(name)+'&select=id');
      if(rows&&rows.length){$('name-avail-hint').textContent='Dieser Name ist bereits vergeben.';$('name-avail-hint').className='name-avail taken';}
      else{$('name-avail-hint').textContent='Name verfügbar!';$('name-avail-hint').className='name-avail ok';}
    }catch(e){$('name-avail-hint').textContent='';$('name-avail-hint').className='name-avail';}
  },350);
});

async function saveScore(){
  if(S.hasSavedThisRun)return;
  if(S.isLoggedIn){autoSaveLoggedInUser();return;}
  S.pendingSaveTarget=S.mode==='daily'?'daily':'global';openLoginModal();
}

// Daily-Score speichern: erst RPC versuchen, bei Fehler direkter Insert als Fallback.
async function submitDailyScore(name){
  var deviceId=getOrCreateDeviceId();
  try{
    var res=await sbFetch('rpc/submit_wels_daily_score','POST',{p_name:name,p_score:S.score,p_date_key:S.dailyKey,p_device_id:deviceId});
    if(res&&res.ok)return {ok:true};
    if(res&&res.error)return {ok:false,error:res.error};
  }catch(e){ /* RPC kaputt → Fallback */ }
  try{
    await sbFetch('wels_daily_scores','POST',{name:name,score:S.score,date_key:S.dailyKey,device_id:deviceId,created_at:new Date().toISOString()});
    return {ok:true,fallback:true};
  }catch(e2){ return {ok:false,error:(e2&&e2.code==='23505')?'ALREADY_PLAYED_TODAY':'INSERT_FAILED'}; }
}

async function autoSaveLoggedInUser(){
  if(S.hasSavedThisRun)return;
  var session=loadSession();if(!session.name||!session.pwHash){saveScore();return;}
  try{
    if(S.pendingSaveTarget==='daily'){
      var res=await submitDailyScore(session.name);
      if(!res||!res.ok){if(res&&res.error==='ALREADY_PLAYED_TODAY'){markDailyPlayedLocally(S.dailyKey);markScoreSavedUI();}return;}
      markDailyPlayedLocally(S.dailyKey);markScoreSavedUI();updateDailyPlayAvailability();return;
    }
    await sbFetch('wels_scores','POST',{name:session.name,score:S.score});markScoreSavedUI();
  }catch(e){console.warn('Auto-save failed:',e);}
}

async function submitScore(){
  if(S.hasSavedThisRun)return;
  var name=$('save-name').value.trim(),pw=$('save-pw').value;
  if(!saveMode){$('save-error').textContent='Bitte wähle Ja oder Nein.';return;}
  if(!name){$('save-error').textContent='Bitte einen Namen eingeben.';return;}
  if(!pw){$('save-error').textContent='Bitte ein Passwort eingeben.';return;}
  if(!NAME_REGEX.test(name)){$('save-error').textContent='Name: nur Buchstaben, Zahlen, . - _ erlaubt.';return;}
  $('save-error').textContent='';$('save-submit-btn').disabled=true;
  try{
    var inputHash=await hashString(pw);
    var existing=await sbFetch('players?name=ilike.'+encodeURIComponent(name)+'&select=id,name,pw_hash');
    if(saveMode==='new'){
      if(existing&&existing.length){$('save-error').textContent='Dieser Name ist bereits vergeben.';$('save-submit-btn').disabled=false;return;}
      await sbFetch('players','POST',{name:name,pw_hash:inputHash});saveSession(name,inputHash);refreshAuthUI();
      if(window.pfPromptForPhoto)setTimeout(pfPromptForPhoto,700);   // neues Konto → Profilbild anbieten
    } else {
      if(!existing||!existing.length){await sbFetch('players','POST',{name:name,pw_hash:inputHash});saveSession(name,inputHash);refreshAuthUI();}
      else{if(existing[0].pw_hash!==inputHash){$('save-error').textContent='Falsches Passwort.';$('save-submit-btn').disabled=false;return;}saveSession(existing[0].name,inputHash);refreshAuthUI();name=existing[0].name;}
    }
    if(S.pendingSaveTarget==='daily'){
      var res=await submitDailyScore(name);
      if(!res||!res.ok){$('save-error').textContent=(res&&res.error==='ALREADY_PLAYED_TODAY')?'Du hast die Daily heute auf diesem Gerät schon gespielt.':'Fehler beim Speichern.';$('save-submit-btn').disabled=false;return;}
      markDailyPlayedLocally(S.dailyKey);closeModal('save-modal');markScoreSavedUI();await loadDailyBoard();updateDailyPlayAvailability();show('daily-screen');return;
    }
    await sbFetch('wels_scores','POST',{name:name,score:S.score});closeModal('save-modal');markScoreSavedUI();openLeaderboard();
  }catch(e){$('save-error').textContent=(e&&e.error==='ALREADY_PLAYED_TODAY')?'Du hast die Daily heute auf diesem Gerät schon gespielt.':'Fehler beim Speichern.';$('save-submit-btn').disabled=false;}
}

async function hashString(s){
  var buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
}

// ── Daily Board ──
async function loadDailyChampions(){
  var section=$('daily-champions-section'),list=$('daily-champions-list');if(!section||!list)return;
  try{
    var rows=await sbFetch('wels_daily_scores?date_key=eq.'+getYesterdayKey()+'&select=name,score&order=score.desc&limit=3');
    if(!rows||rows.length<1){section.style.display='none';return;}
    // Sort by score descending to ensure correct rank assignment
    rows=rows.slice().sort(function(a,b){return b.score-a.score;});
    section.style.display='block';list.innerHTML='';
    // Podium: rows[0]=1.Platz(Gold), rows[1]=2.Platz(Silber), rows[2]=3.Platz(Bronze)
    // Anzeige-Reihenfolge: Silber links, Gold mitte, Bronze rechts
    var podiumOrder=rows.length>=3?[rows[1],rows[0],rows[2]]:rows.length===2?[rows[1],rows[0]]:[rows[0]];
    var medals=['🥇','🥈','🥉'];
    // Gold=index 0, Silber=index 1, Bronze=index 2
    var podiumColors=['#FFD700','#C0C0C0','#CD7F32'];
    var podiumGlow=['rgba(255,215,0,.55)','rgba(192,192,192,.45)','rgba(205,127,50,.45)'];
    var podiumBorder=['rgba(255,215,0,.7)','rgba(192,192,192,.6)','rgba(205,127,50,.6)'];
    var heights=['5.5rem','7.5rem','4.5rem']; // silber, gold, bronze
    list.style.cssText='display:flex;align-items:flex-end;justify-content:center;gap:.75rem;padding:.75rem 0 0';
    podiumOrder.forEach(function(r,pi){
      var origIdx=rows.indexOf(r); // 0=gold,1=silber,2=bronze
      var color=podiumColors[origIdx];
      var glow=podiumGlow[origIdx];
      var border=podiumBorder[origIdx];
      var height=heights[pi]; // pi=0=links(silber),pi=1=mitte(gold),pi=2=rechts(bronze)
      var placeLabel=['2.','1.','3.'][pi];
      var el=document.createElement('div');
      el.className='podium-slot podium-slot-'+(origIdx===0?'gold':origIdx===1?'silver':'bronze');
      el.style.cssText='display:flex;flex-direction:column;align-items:center;gap:.25rem;flex:1;max-width:7rem;animation:podiumRise .6s '+(pi===1?.05:pi===0?.2:.35)+'s cubic-bezier(.16,1,.3,1) both';
      el.innerHTML=
        '<div class="podium-medal" style="font-size:'+(pi===1?'1.8rem':'1.3rem')+';filter:drop-shadow(0 0 10px '+glow+') drop-shadow(0 0 4px '+glow+');animation:medalBounce 2.5s '+(pi===1?.3:pi===0?.5:.7)+'s ease-in-out infinite alternate">'+medals[origIdx]+'</div>'
        +'<div style="font-size:'+(pi===1?'.82rem':'.72rem')+';font-weight:700;color:'+color+';text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;text-shadow:0 0 18px '+glow+',0 0 6px '+glow+'">'+escHtml(r.name)+'</div>'
        +'<div style="font-size:.6rem;color:var(--mist);letter-spacing:.04em">'+fmtN(r.score)+' Pkt.</div>'
        +'<div class="podium-block" style="width:100%;background:linear-gradient(180deg,'+color+'44 0%,'+color+'18 50%,'+color+'08 100%);border:1.5px solid '+border+';border-bottom:none;border-radius:8px 8px 0 0;height:'+height+';display:flex;align-items:flex-start;justify-content:center;padding-top:.5rem;box-shadow:0 -6px 24px '+glow+',inset 0 1px 0 rgba(255,255,255,.15);position:relative;overflow:hidden;">'
        +'<span style="font-size:.65rem;color:'+color+';font-weight:700;letter-spacing:.06em;text-shadow:0 0 10px '+glow+'">'+placeLabel+'</span>'
        +'<div style="position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,'+color+',transparent);animation:podiumShimmer 2s '+(origIdx*.4)+'s linear infinite"></div>'
        +'</div>';
      list.appendChild(el);
    });
  }catch(e){section.style.display='none';}
}

async function loadDailyBoard(){
  var boardEl=$('daily-lb-list');if(!boardEl)return;
  boardEl.innerHTML='<div style="font-size:.7rem;color:var(--mist);text-align:center;padding:1rem">Lade…</div>';
  try{
    var rows=await sbFetch('wels_daily_scores?date_key=eq.'+getViennaDateKey()+'&select=name,score,created_at&order=score.desc&limit=50');
    boardEl.innerHTML='';
    if(!rows||!rows.length){boardEl.innerHTML='<div style="font-size:.72rem;color:var(--mist);text-align:center;padding:1.2rem">Heute noch keine Einträge.</div>';return;}
    var dav={};
    try{ var dnl=rows.map(function(r){return '"'+r.name+'"';}).join(','); var dprows=await sbFetch('players?select=name,avatar_url&name=in.('+dnl+')'); if(dprows)dprows.forEach(function(p){if(p.avatar_url)dav[p.name.toLowerCase()]=p.avatar_url;}); }catch(e){}
    var medals=['🥇','🥈','🥉'];
    rows.forEach(function(r,i){
      try{
        var div=document.createElement('div');div.className='lb-row';
        var rank=i<3?'<span class="lb-rank gold">'+medals[i]+'</span>':'<span class="lb-rank">'+(i+1)+'</span>';
        var d=r.created_at?new Date(r.created_at):null;
        var valid=d&&!isNaN(d.getTime());
        var date=valid?fmtDate(d):'—', time=valid?d.toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit'}):'';
        var _da=dav[(r.name||'').toLowerCase()];
        var daHtml='<span class="lb-avatar'+(_da?' has':'')+'"'+(_da?' style="background-image:url(\''+_da+'\')"':'')+'>'+(_da?'':escHtml((r.name||'?').charAt(0).toUpperCase()))+'</span>';
        div.innerHTML=rank+daHtml+'<span class="lb-name">'+escHtml(r.name||'—')+'</span><span class="lb-score">'+fmtN(r.score||0)+'</span><span class="lb-date" data-time="'+time+'">'+date+'</span>';
        boardEl.appendChild(div);setTimeout(function(el){return function(){el.classList.add('in');};}(div),i*45);
      }catch(rowErr){console.error('[daily-board row]',rowErr);}
    });
  }catch(e){console.error('[daily-board]',e);boardEl.innerHTML='<div style="font-size:.72rem;color:#e8826a;text-align:center;padding:1.2rem">Fehler beim Laden.</div>';}
}

// ── Home ──
function goHome(){
  if(S.vsPollInterval){clearInterval(S.vsPollInterval);S.vsPollInterval=null;}
  if(S.heartbeatInterval){clearInterval(S.heartbeatInterval);S.heartbeatInterval=null;}
  stopSpectatePoll();clearNextVoteTimers();
  if(S.vsRoom&&S.isVs)cleanupRoom();
  S.isVs=false;S.vsRoom=null;$('play-again-btn').disabled=false;$('play-again-btn').style.display='';
  $('vs-left-msg').classList.remove('show');$('survival-fail-overlay').classList.remove('show');
  show('start-screen');renderStreakDisplay('streak-display-start');
}
async function cleanupRoom(){try{await sbFetch('rooms?id=eq.'+S.vsRoom,'DELETE');}catch(e){}}

// ── QR ──
function drawQR(canvas,text){
  if(typeof QRious!=='undefined'){new QRious({element:canvas,value:text,size:160,foreground:'#1a3322',background:'#ffffff',level:'M'});return;}
  var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
  s.onload=function(){new QRious({element:canvas,value:text,size:160,foreground:'#1a3322',background:'#ffffff',level:'M'});};document.head.appendChild(s);
}
function openQrScanner(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert('QR-Scanner auf diesem Gerät nicht verfügbar.');return;}
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:900;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem';
  overlay.innerHTML='<p style="font-family:DM Mono,monospace;font-size:.72rem;color:#8fa89a;letter-spacing:.1em">Kamera auf QR-Code richten</p><video id="qr-video" style="width:min(320px,90vw);border-radius:12px;border:2px solid rgba(201,168,76,.4)" autoplay playsinline muted></video><canvas id="qr-canvas-scan" style="display:none"></canvas><button style="font-family:DM Mono,monospace;font-size:.78rem;color:#f5b7b1;border:1.5px solid rgba(192,57,43,.6);background:rgba(192,57,43,.15);padding:.6rem 1.2rem;border-radius:10px;cursor:pointer" onclick="closeQrScanner()">Abbrechen</button>';
  document.body.appendChild(overlay);window._qrScanOverlay=overlay;
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(function(stream){
    var video=document.getElementById('qr-video');if(!video)return;
    video.srcObject=stream;window._qrStream=stream;video.play();
    if('BarcodeDetector' in window){
      var detector=new BarcodeDetector({formats:['qr_code']}),scanning=true;
      function scan(){
        if(!scanning||!video||video.readyState<2){if(scanning)requestAnimationFrame(scan);return;}
        detector.detect(video).then(function(codes){
          if(!scanning)return;
          if(codes.length>0){scanning=false;var url=codes[0].rawValue,match=url.match(/[?&]join=([A-Z0-9]{6})/i);if(match){closeQrScanner();$('vs-join-code').value=match[1].toUpperCase();}else{alert('Kein gültiger Code.');scanning=true;requestAnimationFrame(scan);}}
          else requestAnimationFrame(scan);
        }).catch(function(){if(scanning)requestAnimationFrame(scan);});
      }
      requestAnimationFrame(scan);
    } else {
      var script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.onload=function(){
        var canvas=document.getElementById('qr-canvas-scan'),ctx=canvas.getContext('2d'),scanning=true;
        function scan(){
          if(!scanning||!video||video.readyState<2){if(scanning)requestAnimationFrame(scan);return;}
          canvas.width=video.videoWidth;canvas.height=video.videoHeight;ctx.drawImage(video,0,0);
          var imgData=ctx.getImageData(0,0,canvas.width,canvas.height),code=jsQR(imgData.data,imgData.width,imgData.height);
          if(code){scanning=false;var match=code.data.match(/[?&]join=([A-Z0-9]{6})/i);if(match){closeQrScanner();$('vs-join-code').value=match[1].toUpperCase();}else{scanning=true;requestAnimationFrame(scan);}}
          else requestAnimationFrame(scan);
        }
        requestAnimationFrame(scan);
      };document.head.appendChild(script);
    }
  }).catch(function(){closeQrScanner();alert('Kamerazugriff verweigert.');});
}
function closeQrScanner(){
  if(window._qrStream){window._qrStream.getTracks().forEach(function(t){t.stop();});window._qrStream=null;}
  if(window._qrScanOverlay){window._qrScanOverlay.remove();window._qrScanOverlay=null;}
}

// ── Mehrspieler (Lobby, N Spieler) ──
// Geteilte Tabellen rooms + room_players (eine Zeile pro Spieler → keine Clobber-Races).
// Jeder Client schreibt NUR seine eigene room_players-Zeile; der Host besitzt den rooms-Zustand.
var VS_WINS_KEY='wg_vs_wins';   // pro Repo: wg_/sg_
var MP_SITE='wels';   // pro Repo: 'wels'/'scharten' — verhindert Cross-Site-Räume in der geteilten rooms-Tabelle

function ensurePlayerId(){
  if(S.playerId)return S.playerId;
  var id='';try{id=localStorage.getItem('pg_player_id')||'';}catch(e){}
  if(!id){id=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():('p'+Math.random().toString(36).slice(2)+Date.now().toString(36));try{localStorage.setItem('pg_player_id',id);}catch(e){}}
  S.playerId=id;return id;
}
function mpOnline(p){ return p&&!p.kicked&&p.online&&p.last_seen&&(Date.now()-new Date(p.last_seen).getTime())<9000; }
function mpInMatch(players){ return (players||[]).filter(function(p){return !p.kicked;}); }
function mpPlayerCount(){ return mpInMatch(S.mpPlayers).filter(function(p){return mpOnline(p);}).length; }
function _pq(){ return 'room_players?room_id=eq.'+S.vsRoom+'&player_id=eq.'+encodeURIComponent(S.playerId); }

// ── Modal: erstellen / beitreten ──
function openVsModal(){
  ensurePlayerId();
  var session=loadSession();
  if(session.name){var h=$('vs-host-name');if(h)h.value=session.name;}
  showVsChoice();
  openModal('vs-modal');
}
function showVsChoice(){
  stopRoomListPoll();
  var ch=$('vs-choice-btns');if(ch)ch.style.display='flex';
  var jp=$('vs-join-panel');if(jp)jp.style.display='none';
  var b=$('vs-modal-back-btn');if(b)b.style.display='none';
}
function showVsPanel(which){
  $('vs-choice-btns').style.display='none';
  var b=$('vs-modal-back-btn');if(b)b.style.display='block';
  // nur noch das Beitreten-Panel; Erstellen geht direkt in die Lobby (Einstellungen dort)
  $('vs-join-panel').style.display='flex';
  // ohne Account: Namensfeld zeigen
  var nm=$('vs-join-name');if(nm)nm.style.display=loadSession().name?'none':'block';
  startRoomListPoll();
}
// Liste offener Räume
async function loadRoomList(silent){
  var el=$('vs-room-list');if(!el)return;
  if(!silent&&!el.children.length)el.innerHTML='<div class="mp-empty">Lade…</div>';
  try{
    var rows=await sbFetch('rooms?status=eq.lobby&site=eq.'+MP_SITE+'&select=id,host_name,rounds,max_players,room_players(player_id,kicked,online,last_seen)&order=last_activity.desc&limit=40');
    var open=(rows||[]).map(function(r){
      var ps=(r.room_players||[]).filter(function(p){return !p.kicked&&p.online&&p.last_seen&&(Date.now()-new Date(p.last_seen).getTime())<12000;});
      return {id:r.id,host:r.host_name,n:ps.length,max:r.max_players,rounds:r.rounds};
    }).filter(function(r){return r.n>0&&(!r.max||r.n<r.max);});
    if(!open.length){el.innerHTML='<div class="mp-empty">Keine offenen Räume. Erstelle selbst einen!</div>';return;}
    el.innerHTML=open.map(function(r){
      return '<button class="mp-room-row" onclick="joinRoomFromList(\''+r.id+'\')">'+
        '<span class="mp-room-host">'+escHtml(r.host||'Raum')+'</span>'+
        '<span class="mp-room-meta">'+r.n+(r.max?('/'+r.max):'')+' 👤 · '+r.rounds+' Runden</span>'+
        '<span class="mp-room-join">Beitreten →</span></button>';
    }).join('');
  }catch(e){ if(!el.children.length)el.innerHTML='<div class="mp-empty">Fehler beim Laden.</div>'; }
}
// Raumliste jede Sekunde aktualisieren, solange das Beitreten-Panel offen ist (stoppt sich selbst)
function startRoomListPoll(){
  stopRoomListPoll(); loadRoomList();
  S._roomListIv=setInterval(function(){
    var p=$('vs-join-panel'),m=$('vs-modal');
    if(!p||p.style.display==='none'||!(m&&m.classList.contains('open'))){stopRoomListPoll();return;}
    loadRoomList(true);
  },1000);
}
function stopRoomListPoll(){ if(S._roomListIv){clearInterval(S._roomListIv);S._roomListIv=null;} }
async function joinRoomFromList(code){
  var session=loadSession();
  var name=session.name||(($('vs-join-name')&&$('vs-join-name').value)||'').trim();
  if(!name){var e=$('vs-join-error');if(e)e.textContent='Bitte zuerst deinen Namen eingeben.';var nm=$('vs-join-name');if(nm){nm.style.display='block';nm.focus();}return;}
  var res=await mpJoinByCode(code,name);
  if(res.error){var er=$('vs-join-error');if(er)er.textContent=res.error;loadRoomList();return;}
  closeModal('vs-modal');enterLobby();
}
// Host ändert Einstellungen live in der Lobby
function mpHostUpdateSettings(){
  if(!S.vsIsHost||!S.vsRoom)return;
  var rounds=Math.max(1,Math.min(100,parseInt(($('mp-rounds')&&$('mp-rounds').value)||'5',10)||5));
  var maxRaw=(($('mp-maxplayers')&&$('mp-maxplayers').value)||'').trim();
  var maxPlayers=maxRaw?Math.max(2,Math.min(50,parseInt(maxRaw,10)||2)):null;
  var modifiers=mpReadModifiers();
  sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',{rounds:rounds,max_players:maxPlayers,modifiers:modifiers,last_activity:new Date().toISOString()}).catch(function(){});
}
function mpReadModifiers(){
  function ck(id){var e=$(id);return !!(e&&e.checked);}
  var tlOn=ck('mp-mod-timelimit');
  var tlVal=parseInt(($('mp-timelimit-secs')&&$('mp-timelimit-secs').value)||'0',10);
  return {noMove:ck('mp-mod-nomove'),noLook:ck('mp-mod-nolook'),grayscale:ck('mp-mod-gray'),blur:ck('mp-mod-blur'),timeLimit:(tlOn&&tlVal>0)?tlVal:null};
}

var roomCreationInProgress=false;
async function createRoom(){
  if(roomCreationInProgress)return;
  ensurePlayerId();
  var session=loadSession();
  var name=session.name||(($('vs-host-name')&&$('vs-host-name').value)||'').trim()||'Spieler';
  // Standard-Einstellungen; der Host passt sie danach live in der Lobby an
  var rounds=5, maxPlayers=null, modifiers={noMove:false,noLook:false,grayscale:false,blur:false,timeLimit:null};
  roomCreationInProgress=true;
  var code=randomCode();
  try{
    await sbFetch('rooms','POST',{id:code,host_name:name,host_id:S.playerId,status:'lobby',site:MP_SITE,max_players:maxPlayers,rounds:rounds,modifiers:modifiers,current_round:0,location_ids:[],last_activity:new Date().toISOString()});
    await sbFetch('room_players','POST',{room_id:code,player_id:S.playerId,name:name,is_host:true,ready:false,online:true,last_seen:new Date().toISOString(),scores:[]});
    S.vsRoom=code;S.vsIsHost=true;S.vsMyName=name;S.isVs=false;S._mpStarted=false;
    closeModal('vs-modal');enterLobby();
  }catch(e){alert('Fehler beim Erstellen: '+(e&&e.message?e.message:JSON.stringify(e)));}
  finally{roomCreationInProgress=false;}
}
async function mpJoinByCode(code,name){
  ensurePlayerId();
  try{
    var rows=await sbFetch('rooms?id=eq.'+code+'&select=id,status,site,max_players,host_id,room_players(player_id,online,kicked)');
    if(!rows||!rows.length)return {error:'Raum nicht gefunden.'};
    var room=rows[0];
    if(room.site&&room.site!==MP_SITE)return {error:'Dieser Raum gehört zu einem anderen GUESSR.'};
    var players=room.room_players||[];
    var mine=players.filter(function(p){return p.player_id===S.playerId;})[0];
    if(!mine&&room.status&&room.status!=='lobby')return {error:'Spiel läuft bereits.'};
    var active=players.filter(function(p){return !p.kicked;});
    if(!mine&&room.max_players&&active.length>=room.max_players)return {error:'Raum ist voll.'};
    if(mine){
      await sbFetch(_pqFor(code)+'','PATCH',{name:name,online:true,kicked:false,last_seen:new Date().toISOString()});
    }else{
      await sbFetch('room_players','POST',{room_id:code,player_id:S.playerId,name:name,is_host:(room.host_id===S.playerId),ready:false,online:true,last_seen:new Date().toISOString(),scores:[]});
    }
    S.vsRoom=code;S.vsIsHost=(room.host_id===S.playerId);S.vsMyName=name;S.isVs=false;S._mpStarted=false;
    return {ok:true};
  }catch(e){return {error:'Fehler beim Beitreten.'};}
}
function _pqFor(code){ return 'room_players?room_id=eq.'+code+'&player_id=eq.'+encodeURIComponent(S.playerId); }
async function joinRoom(){
  var session=loadSession();
  var name=session.name||(($('vs-join-name')&&$('vs-join-name').value)||'').trim()||'Spieler';
  var code=($('vs-join-code').value||'').trim().toUpperCase();
  if(!code){$('vs-join-error').textContent='Bitte Code eingeben.';return;}
  $('vs-join-error').textContent='';
  var res=await mpJoinByCode(code,name);
  if(res.error){$('vs-join-error').textContent=res.error;return;}
  closeModal('vs-modal');enterLobby();
}

// ── Deep link / QR ──
function checkDeepLink(){
  var params=new URLSearchParams(window.location.search),joinCode=params.get('join');
  if(joinCode&&joinCode.length===6){
    S.qrPendingCode=joinCode.toUpperCase();window.history.replaceState({},'',window.location.pathname);
    var session=loadSession();
    setTimeout(function(){
      if(session.name){autoQrJoin(S.qrPendingCode,session.name);}
      else{$('qr-join-room-code').textContent='Raum: '+S.qrPendingCode;var n=$('qr-join-name-input');if(n)n.value=session.name||'';show('qr-join-screen');setTimeout(function(){if(n)n.focus();},400);}
    },300);
  }
}
async function autoQrJoin(code,name){
  var res=await mpJoinByCode(code,name);
  if(res.error){$('qr-join-room-code').textContent='Raum: '+code;var n=$('qr-join-name-input');if(n)n.value=name;$('qr-join-error').textContent=res.error;show('qr-join-screen');return;}
  enterLobby();
}
async function qrJoinSubmit(){
  var name=($('qr-join-name-input').value||'').trim();
  if(!name){$('qr-join-error').textContent='Bitte Namen eingeben.';return;}
  var res=await mpJoinByCode(S.qrPendingCode,name);
  if(res.error){$('qr-join-error').textContent=res.error;return;}
  enterLobby();
}

// ── Lobby ──
function enterLobby(){
  ensurePlayerId();
  show('mp-lobby-screen');
  var cd=$('mp-lobby-code');if(cd)cd.textContent=S.vsRoom;
  try{var qc=$('mp-lobby-qr');if(qc)drawQR(qc,window.location.origin+window.location.pathname+'?join='+S.vsRoom);}catch(e){}
  S._mpSettingsInit=false;S._mpStarting=false;
  ['mp-ready-btn','mp-ready-btn-bot'].forEach(function(id){var rb=$(id);if(rb){rb.disabled=false;rb.textContent='Bereit';rb.classList.remove('is-ready');}});
  startMpPoll();startMpHeartbeat();
}
function renderLobby(room,players){
  var mod=room.modifiers||{};
  // Einstellungs-Controls: Host darf bearbeiten (nur einmal initial befüllen, sonst tippt man dagegen an);
  // Gäste sehen sie schreibgeschützt und gespiegelt.
  var host=S.vsIsHost;
  function setVal(id,v){var e=$(id);if(e&&document.activeElement!==e)e.value=v;}
  function setChk(id,v){var e=$(id);if(e)e.checked=!!v;}
  function setDis(id,d){var e=$(id);if(e)e.disabled=d;}
  if(!host){
    setVal('mp-rounds',room.rounds||5);
    setVal('mp-maxplayers',room.max_players||'');
    setChk('mp-mod-nomove',mod.noMove);setChk('mp-mod-nolook',mod.noLook);setChk('mp-mod-gray',mod.grayscale);setChk('mp-mod-blur',mod.blur);
    setChk('mp-mod-timelimit',!!mod.timeLimit);setVal('mp-timelimit-secs',mod.timeLimit||30);
  } else if(!S._mpSettingsInit){
    S._mpSettingsInit=true;
    setVal('mp-rounds',room.rounds||5);setVal('mp-maxplayers',room.max_players||'');
    setChk('mp-mod-nomove',mod.noMove);setChk('mp-mod-nolook',mod.noLook);setChk('mp-mod-gray',mod.grayscale);setChk('mp-mod-blur',mod.blur);
    setChk('mp-mod-timelimit',!!mod.timeLimit);setVal('mp-timelimit-secs',mod.timeLimit||30);
  }
  ['mp-rounds','mp-maxplayers','mp-mod-nomove','mp-mod-nolook','mp-mod-gray','mp-mod-blur','mp-mod-timelimit','mp-timelimit-secs'].forEach(function(id){setDis(id,!host);});
  var lock=$('mp-settings-lock');if(lock)lock.textContent=host?'':'(nur Host)';
  var online=mpInMatch(players).filter(function(p){return mpOnline(p)||p.player_id===S.playerId;});
  // stabile Reihenfolge (sonst springt die Liste bei jedem Poll), nach Beitrittszeit dann ID
  online.sort(function(a,b){var ta=a.joined_at?new Date(a.joined_at).getTime():0,tb=b.joined_at?new Date(b.joined_at).getTime():0;return ta!==tb?ta-tb:(a.player_id<b.player_id?-1:1);});
  var cnt=$('mp-lobby-count');if(cnt)cnt.textContent='('+online.length+')';
  var list=$('mp-lobby-players');
  if(list){
    list.innerHTML=online.length?online.map(function(p){
      var you=p.player_id===S.playerId,ph=p.player_id===room.host_id;
      var kick=(S.vsIsHost&&!ph)?'<button class="mp-kick-btn" onclick="kickPlayer(\''+p.player_id+'\')" title="Entfernen">✕</button>':'';
      var dot=(you&&!p.ready)
        ? '<span class="mp-player-dot clickable" onclick="toggleReady()" title="Klicken = bereit"></span>'
        : '<span class="mp-player-dot'+(p.ready?' ready':'')+'"></span>';
      return '<div class="mp-player-row'+(you?' me':'')+'">'+
        dot+
        '<span class="mp-player-name">'+escHtml(p.name)+(ph?' 👑':'')+(you?' (Du)':'')+'</span>'+
        '<span class="mp-player-status">'+(p.ready?'Bereit':'…')+'</span>'+kick+'</div>';
    }).join(''):'<div class="mp-empty">Warte auf Spieler…</div>';
  }
  var meRow=online.filter(function(p){return p.player_id===S.playerId;})[0];
  var iAmReady=!!(meRow&&meRow.ready);
  // Bereit-Button (oben + unten): einmalig, danach ausgegraut. Jeder (auch Host) muss bereit machen.
  ['mp-ready-btn','mp-ready-btn-bot'].forEach(function(id){ var rb=$(id); if(rb){ rb.textContent=iAmReady?'Bereit ✓':'Bereit'; rb.disabled=iAmReady; rb.classList.toggle('is-ready',iAmReady); } });
  var readyCount=online.filter(function(p){return p.ready;}).length;
  var hint=$('mp-start-hint');
  if(hint){
    if(online.length<2) hint.textContent='Warte auf mind. 2 Spieler…';
    else if(readyCount<online.length) hint.textContent='Bereit: '+readyCount+'/'+online.length+', warte auf alle…';
    else hint.textContent='Alle bereit, Start…';
  }
  var hc=$('mp-host-close-btn');if(hc)hc.style.display=S.vsIsHost?'':'none';
}
async function toggleReady(){
  // Einweg: einmal bereit, bleibt bereit (kein Zurück), dann startet automatisch wenn alle bereit
  try{ await sbFetch(_pq(),'PATCH',{ready:true,last_seen:new Date().toISOString()}); ['mp-ready-btn','mp-ready-btn-bot'].forEach(function(id){var rb=$(id);if(rb){rb.disabled=true;rb.textContent='Bereit ✓';rb.classList.add('is-ready');}}); }catch(e){}
}
async function kickPlayer(pid){
  if(!S.vsIsHost)return;
  try{await sbFetch('room_players?room_id=eq.'+S.vsRoom+'&player_id=eq.'+encodeURIComponent(pid),'PATCH',{kicked:true,online:false});}catch(e){}
}
async function startMatch(){
  if(!S.vsIsHost){S._mpStarting=false;return;}
  try{
    var rows=await sbFetch('rooms?id=eq.'+S.vsRoom+'&select=rounds,status,room_players(player_id,ready,online,kicked,last_seen)');
    var room=rows&&rows[0];if(!room){S._mpStarting=false;return;}
    if(room.status!=='lobby'){return;} // schon gestartet
    var online=(room.room_players||[]).filter(function(p){return mpOnline(p)||p.player_id===S.playerId;});
    if(online.length<2||!online.every(function(p){return p.ready;})){S._mpStarting=false;return;}
    var n=Math.max(1,room.rounds||5);
    var locs=shuffle(LOCATIONS.slice()).slice(0,n).map(function(l){return l.id;});
    await sbFetch('room_players?room_id=eq.'+S.vsRoom,'PATCH',{scores:[],guess_latlng:null,skip_vote:null});
    await sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',{status:'playing',current_round:0,location_ids:locs,round_started_at:new Date().toISOString(),last_activity:new Date().toISOString()});
  }catch(e){S._mpStarting=false;}
}
// Host schließt den Raum für alle
async function hostCloseRoom(){
  if(!S.vsIsHost||!S.vsRoom)return;
  if(!confirm('Raum für alle schließen?'))return;
  try{ await sbFetch('rooms?id=eq.'+S.vsRoom,'DELETE'); }catch(e){}
  stopMpPolls();if(S.heartbeatInterval){clearInterval(S.heartbeatInterval);S.heartbeatInterval=null;}
  S.isVs=false;S.vsRoom=null;S._mpStarted=false;show('start-screen');
}
function cancelRoom(){ leaveRoom(); }
function leaveRoom(){ cleanupRoom(); show('start-screen'); }

// ── Poll (rooms + room_players in einem Request via Embedding) ──
function startMpPoll(){
  if(S.vsPollInterval)clearInterval(S.vsPollInterval);
  S.vsPollInterval=setInterval(mpPollTick,1200);
  mpPollTick();
}
function stopMpPolls(){ if(S.vsPollInterval){clearInterval(S.vsPollInterval);S.vsPollInterval=null;} mpClearRoundClock(); }
function stopSpectatePoll(){}
function clearNextVoteTimers(){ if(S.nextVoteAutoTimer){clearInterval(S.nextVoteAutoTimer);S.nextVoteAutoTimer=null;} }
async function mpPollTick(){
  if(!S.vsRoom)return;
  try{
    var rows=await sbFetch('rooms?id=eq.'+S.vsRoom+'&select=*,room_players(*)');
    if(!rows||!rows[0]){ handleMpRoomGone(); return; }
    var room=rows[0],players=room.room_players||[];
    S.mpRoom=room;S.mpPlayers=players;S.mpModifiers=room.modifiers||{};S.vsIsHost=(room.host_id===S.playerId);
    var me=players.filter(function(p){return p.player_id===S.playerId;})[0];
    if(me&&me.kicked){handleKicked();return;}
    mpDetectLeavers(players);
    mpMaybeMigrateHost(room,players);
    S.vsIsHost=(room.host_id===S.playerId);
    if($('mp-lobby-screen').classList.contains('active')){
      renderLobby(room,players);
      if(room.status==='playing'){beginMpMatch(room);return;}
      // Host: sobald alle (inkl. Host) bereit sind, automatisch starten
      if(S.vsIsHost&&room.status==='lobby'&&!S._mpStarting){
        var on=mpInMatch(players).filter(function(p){return mpOnline(p)||p.player_id===S.playerId;});
        if(on.length>=2&&on.every(function(p){return p.ready;})){ S._mpStarting=true; startMatch(); }
      }
      return;
    }
    if(room.status==='playing'){
      if(!S._mpStarted){beginMpMatch(room);return;}
      if(room.round_started_at)S.mpRoundStartedAt=new Date(room.round_started_at).getTime();
      var cr=room.current_round||0;
      if(cr>S.round){goToMpRound(cr,room);return;}
      mpUpdateLiveState(room,players);
      mpMaybeShowSkipNotice(room,players);
      if(S.vsIsHost)mpHostMaybeAdvance(room,players);
      return;
    }
    if(room.status==='lobby'){
      if($('final-screen').classList.contains('active')||$('result-screen').classList.contains('active')||$('game-screen').classList.contains('active')){S._mpStarted=false;enterLobby();}
      return;
    }
    // status 'finished' → auf dem Endbildschirm bleiben
  }catch(e){}
}
// Host-Migration: wenn der Host offline ist, übernimmt deterministisch der Online-Spieler mit der kleinsten ID
function mpMaybeMigrateHost(room,players){
  if(!room.host_id||!S.vsRoom)return;
  var hostRow=players.filter(function(p){return p.player_id===room.host_id;})[0];
  if(hostRow&&mpOnline(hostRow))return; // Host da
  var online=mpInMatch(players).filter(function(p){return mpOnline(p);});
  if(!online.length)return;
  online.sort(function(a,b){return a.player_id<b.player_id?-1:1;});
  if(online[0].player_id!==S.playerId)return; // nur der designierte Nachfolger handelt
  if(S._mpMigrating)return; S._mpMigrating=true;
  sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',{host_id:S.playerId,last_activity:new Date().toISOString()})
    .then(function(){ S.vsIsHost=true; S._mpSettingsInit=false; showDcNotice('Du bist jetzt Host 👑'); if(S._mpLeaveT)clearTimeout(S._mpLeaveT); S._mpLeaveT=setTimeout(hideDcNotice,3500); setTimeout(function(){S._mpMigrating=false;},2000); })
    .catch(function(){S._mpMigrating=false;});
}
// Meldung, wenn ein Spieler den Raum verlässt / die Verbindung verliert
function mpDetectLeavers(players){
  var nowOnline={};
  mpInMatch(players).forEach(function(p){ if(mpOnline(p)) nowOnline[p.player_id]=p.name; });
  if(S._mpPrevOnline){
    Object.keys(S._mpPrevOnline).forEach(function(id){
      if(id!==S.playerId && !nowOnline[id]){ showDcNotice((S._mpPrevOnline[id]||'Ein Spieler')+' hat den Raum verlassen.'); if(S._mpLeaveT)clearTimeout(S._mpLeaveT); S._mpLeaveT=setTimeout(hideDcNotice,3500); }
    });
  }
  S._mpPrevOnline=nowOnline;
}
function startMpHeartbeat(){
  if(S.heartbeatInterval)clearInterval(S.heartbeatInterval);
  function beat(){ if(!S.vsRoom)return; sbFetch(_pq(),'PATCH',{online:true,last_seen:new Date().toISOString()}).catch(function(){}); }
  beat();S.heartbeatInterval=setInterval(beat,3000);
}
function vsMarkOffline(){
  if(!S.vsRoom)return;
  try{ fetch(SB_URL+'/rest/v1/'+_pq(),{method:'PATCH',keepalive:true,headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({online:false,last_seen:new Date(Date.now()-60000).toISOString()})}).catch(function(){}); }catch(e){}
}
window.addEventListener('pagehide',vsMarkOffline);
window.addEventListener('beforeunload',vsMarkOffline);

async function cleanupRoom(){
  vsMarkOffline();
  try{
    if(S.vsIsHost&&S.vsRoom){
      // Host verlässt → Hosttitel an anderen Online-Spieler übergeben, sonst Raum löschen
      var rows=await sbFetch('rooms?id=eq.'+S.vsRoom+'&select=room_players(player_id,online,last_seen,kicked)');
      var others=((rows&&rows[0]&&rows[0].room_players)||[]).filter(function(p){return p.player_id!==S.playerId&&!p.kicked&&p.online&&p.last_seen&&(Date.now()-new Date(p.last_seen).getTime())<12000;});
      if(others.length){
        others.sort(function(a,b){return a.player_id<b.player_id?-1:1;});
        await sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',{host_id:others[0].player_id,last_activity:new Date().toISOString()});
        await sbFetch(_pq(),'DELETE');
      } else { await sbFetch('rooms?id=eq.'+S.vsRoom,'DELETE'); }
    } else if(S.vsRoom){ await sbFetch(_pq(),'DELETE'); }
  }catch(e){}
  stopMpPolls();
  if(S.heartbeatInterval){clearInterval(S.heartbeatInterval);S.heartbeatInterval=null;}
  S.isVs=false;S.vsRoom=null;S._mpStarted=false;
}
function handleKicked(){
  var was=S.vsRoom;
  stopMpPolls();if(S.heartbeatInterval){clearInterval(S.heartbeatInterval);S.heartbeatInterval=null;}
  S.isVs=false;S.vsRoom=null;S._mpStarted=false;
  try{sbFetch('room_players?room_id=eq.'+was+'&player_id=eq.'+encodeURIComponent(S.playerId),'DELETE');}catch(e){}
  alert('Du wurdest aus dem Raum entfernt.');show('start-screen');
}
function handleMpRoomGone(){
  stopMpPolls();if(S.heartbeatInterval){clearInterval(S.heartbeatInterval);S.heartbeatInterval=null;}
  if(S.isVs||$('mp-lobby-screen').classList.contains('active')){ S.isVs=false;S.vsRoom=null;S._mpStarted=false; showDcNotice('Raum geschlossen.'); setTimeout(hideDcNotice,3000); show('start-screen'); }
}
function showDcNotice(msg){var e=$('dc-notice');if(e){e.textContent=msg;e.classList.add('show');}}
function hideDcNotice(){var e=$('dc-notice');if(e)e.classList.remove('show');}

// ── Match-Start + Countdown ──
function beginMpMatch(room){
  if(S._mpStarted)return;
  S._mpStarted=true;
  resetScoreSavedUI();
  S.mode='vs';S._vsCounted=false;S.vsWon=false;
  S.roundsTotal=Math.max(1,room.rounds||5);
  resetBaseState();S.isVs=true;
  var ids=room.location_ids||[];
  S.locations=ids.map(function(id){return LOCATIONS.find(function(l){return l.id===id;});}).filter(Boolean);
  // Daten-Mismatch (z.B. Raum eines anderen GUESSR): zu wenige Orte aufgelöst → sauber abbrechen statt Absturz
  if(ids.length&&S.locations.length<ids.length){
    showDcNotice('Dieser Raum gehört zu einem anderen GUESSR.');setTimeout(hideDcNotice,4000);
    S._mpStarted=false;leaveRoom();return;
  }
  S.roundsTotal=Math.max(1,Math.min(S.roundsTotal,S.locations.length||1));
  S.round=0;S.score=0;S.roundScores=[];
  S.mpRoundStartedAt=room.round_started_at?new Date(room.round_started_at).getTime():Date.now();
  S._mpWaitForLen=0;S._mpRepushing=false;S._mpLastGuess=null;S.vsTheirDone=false;S._mpAdvanceAt=0;S._mpSkipVotedRound=-1;S._mpAutoSubmitting=false;
  var others=mpInMatch(S.mpPlayers).filter(function(p){return p.player_id!==S.playerId;});
  S.vsTheirName=others[0]?others[0].name:'Gegner';
  var nP=mpInMatch(S.mpPlayers).length;
  var badge=$('vs-badge');if(badge){badge.style.display='block';badge.textContent=(nP<=2?('VS '+S.vsTheirName):('Mehrspieler · '+nP));}
  mpCountdown(function(){ show('game-screen'); var hb=$('back-to-home-btn');if(hb)hb.style.display='none'; initPanoDrag(); loadRound(); });
}
function mpCountdown(cb){
  var ov=$('mp-countdown');
  if(!ov){cb();return;}
  var n=3;ov.textContent='3';ov.classList.add('show');sfx.roundIntro&&sfx.roundIntro(3);
  var iv=setInterval(function(){
    n--;
    if(n>0){ov.textContent=String(n);sfx.roundIntro&&sfx.roundIntro(n);ov.style.animation='none';void ov.offsetWidth;ov.style.animation='';}
    else if(n===0){ov.textContent='Los!';sfx.next&&sfx.next();}
    else{clearInterval(iv);ov.classList.remove('show');cb();}
  },800);
}
function goToMpRound(targetRound,room){
  if(targetRound<=S.round)return;
  if(Date.now()-(S._lastMpAdvanceAt||0)<500)return;
  S._lastMpAdvanceAt=Date.now();
  mpClearRoundClock();
  if(S._mpRevealIv){clearInterval(S._mpRevealIv);S._mpRevealIv=null;}
  S.round=targetRound;
  S.vsTheirDone=false;S._mpWaitForLen=0;S._mpRepushing=false;S._mpLastGuess=null;S._mpAdvanceAt=0;S._mpRevealed=false;S._mpSkipVotedRound=-1;S._mpAutoSubmitting=false;
  hideVsWaitOverlay();mpRemoveSkipUI();mpHideSkipNotice();
  var board=$('mp-round-board');if(board){board.style.display='none';board.innerHTML='';}
  var row=$('vs-their-guess-row');if(row){row.style.display='none';row.innerHTML='';}
  hideVsWaitOverlay();var bw=$('vs-bottom-wait');if(bw)bw.classList.remove('show');
  S.mpRoundStartedAt=room&&room.round_started_at?new Date(room.round_started_at).getTime():Date.now();
  if(S.round>=S.roundsTotal){ showFinal(); }
  else{ sfx.next&&sfx.next(); show('game-screen'); loadRound(); }
}
function mpHostMaybeAdvance(room,players){
  if(!S.vsIsHost)return;
  if((room.current_round||0)!==S.round)return;
  if(S._mpAdvanceLock)return;
  var online=players.filter(function(p){return mpOnline(p);});
  if(!online.length)return;
  var allDone=online.every(function(p){return (p.scores||[]).length>S.round;});
  var mod=room.modifiers||{};
  var elapsed=(Date.now()-(S.mpRoundStartedAt||Date.now()))/1000;
  var timeUp=mod.timeLimit&&elapsed>(mod.timeLimit+5);
  // Überspringen-Abstimmung: ab 3 Spielern, genug Ja-Stimmen → vorrücken (mit Ergebnis-Anzeige davor)
  var skipForce=mpSkipInfo(players).triggered;
  if(allDone||timeUp||skipForce){
    if(!S._mpAdvanceAt)S._mpAdvanceAt=Date.now()+((allDone||skipForce)?4000:0);
    if(Date.now()<S._mpAdvanceAt)return;
    S._mpAdvanceLock=true;S._mpAdvanceAt=0;
    var next=S.round+1;
    sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',{current_round:next,round_started_at:new Date().toISOString(),last_activity:new Date().toISOString()})
      .then(function(){setTimeout(function(){S._mpAdvanceLock=false;},1500);})
      .catch(function(){S._mpAdvanceLock=false;});
  }else{S._mpAdvanceAt=0;}
}

// ── Modifiers + Rundenuhr ──
function applyMpModifiers(){
  var mod=S.mpModifiers||{};
  try{ if(window.NAV){ NAV.locked=!!mod.noMove; var ov=document.getElementById('nav-arrows'); if(ov)ov.classList.toggle('nav-locked',!!mod.noMove);} }catch(e){}
  S.mpNoLook=!!mod.noLook;
  var dh=$('drag-hint');if(dh&&mod.noLook)dh.style.display='none';
  var gs=$('game-screen');
  if(gs){ gs.classList.toggle('mp-gray',!!mod.grayscale); gs.classList.toggle('mp-blur',!!mod.blur); }
}
function mpClearMods(){ var gs=$('game-screen'); if(gs){gs.classList.remove('mp-gray','mp-blur');} S.mpNoLook=false; }
function mpClearRoundClock(){ if(S._mpClock){clearInterval(S._mpClock);S._mpClock=null;} }
function mpStartRoundClock(){
  mpClearRoundClock();
  var mod=S.mpModifiers||{};
  var timerEl=$('mp-timer');if(timerEl){timerEl.style.display=mod.timeLimit?'block':'none';timerEl.classList.remove('mp-timer-urgent');}
  if(!mod.timeLimit)return;
  S._mpClock=setInterval(function(){
    if(!$('game-screen').classList.contains('active'))return;
    var left=Math.ceil(mod.timeLimit-(Date.now()-(S.mpRoundStartedAt||Date.now()))/1000);
    if(timerEl){timerEl.textContent='⏱ '+Math.max(0,left)+'s';timerEl.classList.toggle('mp-timer-urgent',left<=5&&left>0);}
    if(left<=0){ mpClearRoundClock(); if(timerEl)timerEl.classList.remove('mp-timer-urgent'); if($('game-screen').classList.contains('active')){ if(!S.guessLatLng)S.guessLatLng={lat:CENTER[0],lng:CENTER[1]}; mpShowTimeUp(); submitGuess(); } }
  },250);
}
// kurze „Zeit ist um!"-Einblendung, wenn der Timer automatisch abgibt
function mpShowTimeUp(){
  var el=$('mp-timeup');
  if(!el){ el=document.createElement('div'); el.id='mp-timeup'; el.textContent='⏰ Zeit ist um!'; (($('game-screen'))||document.body).appendChild(el); }
  el.classList.add('show'); setTimeout(function(){ el.classList.remove('show'); },1100);
}

// ── Abgeben + Erkennung ──
function mpOnSubmit(pts){
  S._mpWaitForLen=S.round+1;S._mpLastPts=pts;S._mpLastGuess={lat:S.guessLatLng.lat,lng:S.guessLatLng.lng};S._mpRepushing=false;S._mpRevealed=false;
  mpClearRoundClock();
  pushMpScore(pts,S.guessLatLng);
  showMpWaitOverlay([]); // Ergebnis erst zeigen, wenn ALLE fertig sind
  var nb=$('next-btn');if(nb)nb.style.display='none';
  var bw=$('vs-bottom-wait');if(bw)bw.classList.remove('show');
}
// Vollbild-Warteoverlay: "Warten auf:" + noch ratende Spieler
function showMpWaitOverlay(names){
  var o=$('vs-wait-overlay');if(!o)return;
  var t=$('vs-wait-overlay-text');if(t)t.textContent='Warten auf';
  var sub=$('vs-wait-overlay-sub');
  if(sub)sub.innerHTML=(names&&names.length)?('<div class="mp-wait-names">'+names.map(function(n){return '<span class="mp-wait-name">'+escHtml(n)+'</span>';}).join('')+'</div>'):'<div class="mp-wait-names"><span class="mp-wait-name">…</span></div>';
  o.classList.add('show');
}
function startMpRevealCountdown(){
  if(S._mpRevealIv){clearInterval(S._mpRevealIv);}
  var start=Date.now(),dur=4000,bw=$('vs-bottom-wait');
  if(bw)bw.classList.add('show');
  function upd(){var left=Math.max(0,Math.ceil((dur-(Date.now()-start))/1000));if(bw)bw.textContent=left>0?('Nächste Runde in '+left+'…'):'Nächste Runde…';if(left<=0){clearInterval(S._mpRevealIv);S._mpRevealIv=null;}}
  upd();S._mpRevealIv=setInterval(upd,250);
}
async function pushMpScore(pts,guessLL){
  var roundIdx=S.round;
  for(var a=0;a<5;a++){
    try{
      var rows=await sbFetch(_pq()+'&select=scores');
      if(!rows||!rows[0])return false;
      var cur=(rows[0].scores||[]).slice();
      cur[roundIdx]=pts;for(var i=0;i<cur.length;i++){if(cur[i]==null)cur[i]=0;}
      await sbFetch(_pq(),'PATCH',{scores:cur,guess_latlng:{lat:guessLL.lat,lng:guessLL.lng,round:roundIdx},last_seen:new Date().toISOString()});
      return true;
    }catch(e){ await new Promise(function(r){setTimeout(r,500);}); }
  }
  return false;
}
function mpUpdateLiveState(room,players){
  var inMatch=mpInMatch(players);
  // Self-Heal: eigener Score fehlt im Raum → erneut pushen
  if($('result-screen').classList.contains('active')&&S._mpWaitForLen){
    var meRow=inMatch.filter(function(p){return p.player_id===S.playerId;})[0];
    if(meRow&&(meRow.scores||[]).length<S._mpWaitForLen&&!S._mpRepushing&&S._mpLastGuess){
      S._mpRepushing=true;pushMpScore(S._mpLastPts,S._mpLastGuess).then(function(){S._mpRepushing=false;}).catch(function(){S._mpRepushing=false;});
    }
  }
  if(!$('result-screen').classList.contains('active'))return;
  if(!S._mpWaitForLen)return; // ich habe diese Runde noch nicht abgegeben
  var onlineN=inMatch.filter(function(p){return mpOnline(p)||p.player_id===S.playerId;});
  var notDone=onlineN.filter(function(p){return (p.scores||[]).length<=S.round;});
  var skipGo=mpSkipInfo(players).triggered;
  if(notDone.length>0&&!skipGo){
    // Noch nicht alle fertig → nur Warte-Overlay mit den noch ratenden Spielern, KEIN Ergebnis
    showMpWaitOverlay(notDone.map(function(p){return p.name;}));
    mpRenderSkipUI(players);
    return;
  }
  // Alle fertig ODER Überspringen durchgewinkt → Ergebnis zeigen (Noch-Ratende erscheinen als „…")
  mpRemoveSkipUI();
  // Alle fertig → Ergebnis einmalig aufdecken + Countdown
  if(!S._mpRevealed){
    S._mpRevealed=true;
    hideVsWaitOverlay();
    if(inMatch.length<=2){
      var opp=inMatch.filter(function(p){return p.player_id!==S.playerId;})[0];
      var tg=opp&&opp.guess_latlng;
      if(tg&&(tg.round===undefined||tg.round===S.round)&&S.resultMap){try{L.circleMarker([tg.lat,tg.lng],{radius:8,color:'#8fa89a',fillColor:'#8fa89a',fillOpacity:.8,weight:2}).addTo(S.resultMap).bindTooltip(opp.name,{permanent:true,direction:'top'});}catch(e){}}
      var theirPts=opp?((opp.scores||[])[S.round]||0):0;
      var theirDist=tg?haversine(tg.lat,tg.lng,S.current.lat,S.current.lng):0;
      var myDist=haversine(S.guessLatLng.lat,S.guessLatLng.lng,S.current.lat,S.current.lng);
      var myPts=S.roundScores[S.round]?S.roundScores[S.round].pts:0;
      if(opp)renderRoundCompare(myDist,myPts,theirDist,theirPts);
    }else{
      renderMpRoundBoard(inMatch);
    }
    startMpRevealCountdown();
  }else if(inMatch.length>2){
    renderMpRoundBoard(inMatch);
  }
}
// ── Überspringen-Abstimmung (nur ab 3 Spielern) ──
// Wartende (bereits abgegeben) dürfen abstimmen, sobald >=40% der Lobby abgegeben hat;
// bei >=60% Ja-Stimmen wird die Runde übersprungen. In 2er-Lobbys deaktiviert.
var MP_SKIP_SUBMIT_PCT=0.4, MP_SKIP_VOTE_PCT=0.6;
function mpSkipNeeded(lobbyN){ return Math.ceil(MP_SKIP_VOTE_PCT*lobbyN); }
function mpSkipInfo(players){
  var on=mpInMatch(players).filter(function(p){return mpOnline(p)||p.player_id===S.playerId;});
  var lobbyN=on.length;
  var submittedN=on.filter(function(p){return (p.scores||[]).length>S.round;}).length;
  var votes=on.filter(function(p){return p.skip_vote===S.round;}).length;
  var needed=mpSkipNeeded(lobbyN);
  return {on:on,lobbyN:lobbyN,submittedN:submittedN,votes:votes,needed:needed,
    eligible:(lobbyN>=3&&submittedN>=Math.ceil(MP_SKIP_SUBMIT_PCT*lobbyN)&&((Date.now()-(S.mpRoundStartedAt||Date.now()))/1000>=30)),
    triggered:(lobbyN>=3&&votes>=needed)};
}
function mpVoteSkip(){
  if(!S.vsRoom)return;
  S._mpSkipVotedRound=S.round; // sofortiges UI-Feedback bis zum nächsten Poll
  sbFetch(_pq(),'PATCH',{skip_vote:S.round,last_seen:new Date().toISOString()}).catch(function(){});
  var b=$('mp-skip-vote-btn');if(b){b.disabled=true;b.textContent='Stimme abgegeben ✓';}
}
// Button im Warte-Overlay für Spieler, die schon abgegeben haben
function mpRenderSkipUI(players){
  var o=$('vs-wait-overlay');if(!o)return;
  var si=mpSkipInfo(players);
  var meRow=si.on.filter(function(p){return p.player_id===S.playerId;})[0];
  var iVoted=!!(meRow&&meRow.skip_vote===S.round)||S._mpSkipVotedRound===S.round;
  var wrap=$('mp-skip-vote');
  if(!si.eligible){ if(wrap)wrap.remove(); return; }
  if(!wrap){
    wrap=document.createElement('div');wrap.id='mp-skip-vote';wrap.className='mp-skip-vote';
    wrap.innerHTML='<button class="mp-skip-vote-btn" id="mp-skip-vote-btn" onclick="mpVoteSkip()"></button><div class="mp-skip-tally" id="mp-skip-tally"></div>';
    o.appendChild(wrap);
  }
  var b=$('mp-skip-vote-btn'),tally=$('mp-skip-tally');
  if(b){ b.disabled=iVoted; b.textContent=iVoted?'Stimme abgegeben ✓':'Stimmen fürs Überspringen'; }
  if(tally)tally.textContent=si.votes+'/'+si.needed+' fürs Überspringen';
}
function mpRemoveSkipUI(){ var w=$('mp-skip-vote');if(w)w.remove(); }
// Hinweis für noch ratende Spieler auf dem Spielbildschirm
function mpEnsureSkipNotice(){
  var el=$('mp-skip-notice');
  if(!el){ el=document.createElement('div');el.id='mp-skip-notice';el.className='mp-skip-notice';var gs=$('game-screen');if(gs)gs.appendChild(el); }
  return el;
}
function mpShowSkipNotice(x,y){ var el=mpEnsureSkipNotice();if(!el)return;el.textContent='⏭ '+x+'/'+y+' Personen haben fürs Überspringen gestimmt!';el.classList.add('show'); }
function mpHideSkipNotice(){ var el=$('mp-skip-notice');if(el)el.classList.remove('show'); }
function mpMaybeShowSkipNotice(room,players){
  if(!$('game-screen').classList.contains('active')){mpHideSkipNotice();return;}
  var si=mpSkipInfo(players);
  var meRow=si.on.filter(function(p){return p.player_id===S.playerId;})[0];
  var iSubmitted=!!(meRow&&(meRow.scores||[]).length>S.round);
  if(si.lobbyN>=3&&!iSubmitted&&si.votes>0)mpShowSkipNotice(si.votes,si.needed);
  else mpHideSkipNotice();
  // Abstimmung durch und ich rate noch → automatisch abgeben, damit ich das Rundenergebnis sehe
  // (statt direkt ins nächste Panorama zu springen).
  if(si.triggered&&!iSubmitted&&!S._mpAutoSubmitting){
    S._mpAutoSubmitting=true;
    if(!S.guessLatLng)S.guessLatLng={lat:CENTER[0],lng:CENTER[1]};
    submitGuess();
  }
}
function renderMpRoundBoard(inMatch){
  var board=$('mp-round-board');if(!board)return;
  var rows=inMatch.map(function(p){return {id:p.player_id,name:p.name,pts:((p.scores||[]).length>S.round)?p.scores[S.round]:null};});
  rows.sort(function(a,b){return (b.pts==null?-1:b.pts)-(a.pts==null?-1:a.pts);});
  board.innerHTML='<div class="mp-board-title">Runde '+(S.round+1)+' / '+S.roundsTotal+'</div>'+rows.map(function(r,i){
    var you=r.id===S.playerId;
    return '<div class="mp-board-row'+(you?' me':'')+'">'+
      '<span class="mp-board-rank">'+(r.pts==null?'·':(i+1))+'</span>'+
      '<span class="mp-board-name">'+escHtml(r.name)+(you?' (Du)':'')+'</span>'+
      '<span class="mp-board-pts">'+(r.pts==null?'…':fmtN(r.pts))+'</span></div>';
  }).join('')+(rows.length>5?'<div class="mp-scrollhint">↓ scrollen ('+rows.length+')</div>':'');
  board.style.display='block';
}
function renderRoundCompare(myDist,myPts,theirDist,theirPts){
  var row=$('vs-their-guess-row');if(!row)return;
  var iWon=myPts>theirPts,theyWon=theirPts>myPts;
  var mid=iWon?'▸':theyWon?'◂':'=';
  row.style.display='block';
  row.innerHTML='<div class="vs-h2h">'+
    '<div class="vs-h2h-side'+(iWon?' win':'')+'"><div class="vs-h2h-name">Du</div><div class="vs-h2h-pts">'+fmtN(myPts)+'</div><div class="vs-h2h-dist">'+fmtD(myDist)+'</div></div>'+
    '<div class="vs-h2h-mid">'+mid+'</div>'+
    '<div class="vs-h2h-side'+(theyWon?' win':'')+'"><div class="vs-h2h-name">'+escHtml(S.vsTheirName||'Gegner')+'</div><div class="vs-h2h-pts">'+fmtN(theirPts)+'</div><div class="vs-h2h-dist">'+fmtD(theirDist)+'</div></div>'+
  '</div>';
}

// ── Warte-Overlay / Strip (Kompat) ──
function hideVsWaitOverlay(){var o=$('vs-wait-overlay');if(o)o.classList.remove('show');}
function showVsWaitOverlay(){}
function updateVsStrip(){}
function clearSubmitCountdown(){}

// ── Endbildschirm ──
function mpShowFinal(){
  var inMatch=mpInMatch(S.mpPlayers);
  inMatch.forEach(function(p){p._total=(p.scores||[]).reduce(function(a,b){return a+(b||0);},0);});
  var sorted=inMatch.slice().sort(function(a,b){return b._total-a._total;});
  var myIdx=-1;for(var i=0;i<sorted.length;i++){if(sorted[i].player_id===S.playerId){myIdx=i;break;}}
  var placement=myIdx>=0?myIdx+1:sorted.length;
  if(!S._vsCounted){
    S._vsCounted=true;
    S.vsWon=(placement===1&&sorted.length>=2);
    if(S.vsWon){try{var w=parseInt(localStorage.getItem(VS_WINS_KEY)||'0',10)||0;localStorage.setItem(VS_WINS_KEY,w+1);}catch(e){}}
  }
  var pab=$('play-again-btn');if(pab){pab.style.display='';pab.disabled=false;pab.textContent='Zurück zur Lobby';}
  var saveB=$('save-btn');if(saveB)saveB.style.display='none';
  if(sorted.length<=2)showVsFinal2p(sorted,placement);
  else showMpStandings(sorted,placement);
  if(S.vsIsHost){try{sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',{status:'finished',last_activity:new Date().toISOString()});}catch(e){}}
}
function showVsFinal2p(sorted,placement){
  var box=$('vs-result-box');if(box)box.classList.add('show');
  var standings=$('mp-final-standings');if(standings)standings.style.display='none';
  var my=sorted.filter(function(p){return p.player_id===S.playerId;})[0]||{_total:0,scores:[]};
  var opp=sorted.filter(function(p){return p.player_id!==S.playerId;})[0]||{_total:0,scores:[],name:'Gegner'};
  var wt=$('vs-winner-text');
  if(wt){ if(my._total>opp._total){wt.textContent='Du gewinnst! 🏆';wt.className='vs-winner win';} else if(opp._total>my._total){wt.textContent=escHtml(opp.name)+' gewinnt 🏆';wt.className='vs-winner lose';} else {wt.textContent='Unentschieden 🤝';wt.className='vs-winner tie';} }
  var fy=$('vs-final-you');if(fy)fy.textContent=(S.vsMyName||'Du')+' · '+fmtN(my._total);
  var ft=$('vs-final-them');if(ft)ft.textContent=(opp.name||'Gegner')+' · '+fmtN(opp._total);
  var rc=$('vs-rounds');
  if(rc){
    rc.innerHTML='';
    var n=S.roundsTotal,mine=my.scores||[],theirs=opp.scores||[];
    var head=document.createElement('div');head.className='vs-round-row vs-round-head';
    head.innerHTML='<span class="vrr-you">Du</span><span class="vrr-lbl"></span><span class="vrr-them">'+escHtml(opp.name||'Gegner')+'</span>';
    rc.appendChild(head);
    for(var i=0;i<n;i++){
      var mp=(i<mine.length)?mine[i]:null,tp=(i<theirs.length)?theirs[i]:null;
      var yw=(mp!=null&&tp!=null&&mp>tp),tw=(mp!=null&&tp!=null&&tp>mp);
      var r=document.createElement('div');r.className='vs-round-row';
      r.innerHTML='<span class="vrr-you'+(yw?' w':'')+'">'+(mp==null?'—':fmtN(mp))+(yw?' ▸':'')+'</span><span class="vrr-lbl">R'+(i+1)+'</span><span class="vrr-them'+(tw?' w':'')+'">'+(tw?'◂ ':'')+(tp==null?'—':fmtN(tp))+'</span>';
      rc.appendChild(r);
      (function(el,idx){setTimeout(function(){el.classList.add('in');},120+idx*90);})(r,i);
    }
  }
}
function showMpStandings(sorted,placement){
  var box=$('vs-result-box');if(box)box.classList.remove('show');
  var el=$('mp-final-standings');if(!el)return;
  el.style.display='block';
  var medals=['🥇','🥈','🥉'];
  var head='<div class="mp-standings-place">Du wurdest '+placement+'. von '+sorted.length+(placement===1?' 🏆':'')+'</div>';
  var listHtml=sorted.map(function(p,i){
    var you=p.player_id===S.playerId;
    return '<div class="mp-standings-row'+(you?' me':'')+(i===0?' first':'')+'">'+
      '<span class="mp-standings-rank">'+(medals[i]||(i+1)+'.')+'</span>'+
      '<span class="lb-avatar mp-av" data-name="'+escHtml((p.name||'').toLowerCase())+'">'+escHtml((p.name||'?').charAt(0).toUpperCase())+'</span>'+
      '<span class="mp-standings-name">'+escHtml(p.name)+(you?' (Du)':'')+'</span>'+
      '<span class="mp-standings-total">'+fmtN(p._total)+'</span></div>';
  }).join('');
  el.innerHTML=head+'<div class="mp-standings-list">'+listHtml+'</div>'+(sorted.length>5?'<div class="mp-scrollhint">↓ scrollen für alle '+sorted.length+' Spieler</div>':'');
  mpFillAvatars(el,sorted.map(function(p){return p.name;}));
}
// Avatare in MP-Listen nachladen (room_players haben keinen avatar_url)
function mpFillAvatars(container,names){
  try{
    var nl=names.filter(Boolean).map(function(n){return '"'+n+'"';}).join(',');
    if(!nl||!container)return;
    sbFetch('players?select=name,avatar_url&name=in.('+nl+')').then(function(rows){
      var m={};(rows||[]).forEach(function(p){if(p.avatar_url)m[p.name.toLowerCase()]=p.avatar_url;});
      Array.prototype.forEach.call(container.querySelectorAll('.mp-av'),function(av){
        var u=m[av.getAttribute('data-name')];if(u){av.style.backgroundImage="url('"+u+"')";av.classList.add('has');}
      });
    }).catch(function(){});
  }catch(e){}
}

// Weiter-Button / Space: Solo etc. → nächste Runde; Mehrspieler rückt automatisch vor (kein manuelles Voten)
function voteNext(){ if(S.isVs)return; nextRound(); }

// ── Rematch: zurück in die Lobby (deterministisch, kein Vote-Race) ──
async function votePlayAgain(){
  if(S.isVs){ backToLobby(); return; }
  if(S.mode==='daily'){startDailyChallenge();return;}
  if(S.mode==='survival'){startSurvival();return;}
  if(S.mode==='solo'){startSolo();return;}
}
async function backToLobby(){
  if(S.vsIsHost&&S.vsRoom){
    try{
      await sbFetch('room_players?room_id=eq.'+S.vsRoom,'PATCH',{scores:[],guess_latlng:null,ready:false,skip_vote:null});
      await sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',{status:'lobby',current_round:0,location_ids:[],round_started_at:null,last_activity:new Date().toISOString()});
    }catch(e){}
  }
  S._mpStarted=false;S.isVs=false;
  enterLobby();
}

// ── Aufräumen alter Räume ──
async function cleanupStaleRooms(){try{var cutoff=new Date(Date.now()-2*60*60*1000).toISOString();await sbFetch('rooms?last_activity=lt.'+cutoff,'DELETE');}catch(e){}}

// ── VS skip pano (Kompat-Stubs) ──
function showSkipPanoBtn(){}
function hideSkipPanoBtn(){}
function voteSkipPano(){}
function maybeShowOpponentGuessedHint(){}

// ── Keyboard ──
document.addEventListener('keydown',function(e){
  if(e.code==='Space'||e.key===' '){
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;e.preventDefault();
    if($('survival-explain-overlay')&&$('survival-explain-overlay').classList.contains('show'))return;
    if($('survival-intro-overlay').classList.contains('show'))return;
    if($('survival-score-overlay').classList.contains('show'))return;
    if($('survival-fail-overlay').classList.contains('show'))return;
    if($('game-screen').classList.contains('active')){var btn=$('guess-btn');if(btn&&!btn.disabled&&!btn.dataset.justEnabled){resumeAC();submitGuess();}}
    else if($('result-screen').classList.contains('active')){var nextBtn=$('next-btn');if(nextBtn&&!nextBtn.disabled){resumeAC();voteNext();}}
  }
  if(e.key==='Escape'){
    ['lb-modal','save-modal','admin-modal','vs-modal','vs-wait-modal','changelog-modal','changelog-editor-modal'].forEach(function(id){if($(id)&&$(id).classList.contains('open'))closeModal(id);});
    if(S.isLoggedIn&&$('login-modal')&&$('login-modal').classList.contains('open'))closeModal('login-modal');
    closeLogoutConfirm();
  }
  if((e.key==='m'||e.key==='M')&&$('game-screen').classList.contains('active')&&e.target.tagName!=='INPUT')cycleVolume();
  if((e.key==='e'||e.key==='E')&&$('game-screen').classList.contains('active')&&e.target.tagName!=='INPUT')toggleExpand();
});

function goHomeFromGame(){
  if(!confirm('Zum Hauptmenü zurückgehen? Dein Fortschritt geht verloren.'))return;
  if(S.vsPollInterval){clearInterval(S.vsPollInterval);S.vsPollInterval=null;}
  if(S.heartbeatInterval){clearInterval(S.heartbeatInterval);S.heartbeatInterval=null;}
  stopSpectatePoll();clearNextVoteTimers();if(S.vsRoom&&S.isVs)cleanupRoom();S.isVs=false;S.vsRoom=null;
  $('survival-fail-overlay').classList.remove('show');$('survival-intro-overlay').classList.remove('show');$('survival-score-overlay').classList.remove('show');var _seo=$('survival-explain-overlay');if(_seo)_seo.classList.remove('show');
  show('start-screen');renderStreakDisplay('streak-display-start');
}

function shouldWarnOnLeave(){
  if(S.mode==='solo'&&!S.isVs)return false;   // normales Einzelspiel: keine Warnung, einfach gehen lassen
  if($('start-screen').classList.contains('active'))return false;if($('play-menu-screen').classList.contains('active'))return false;
  if($('daily-screen').classList.contains('active'))return false;if($('final-screen').classList.contains('active'))return false;
  if($('game-screen').classList.contains('active'))return true;if($('result-screen').classList.contains('active')&&S.round<S.roundsTotal)return true;
  return false;
}

window.addEventListener('beforeunload',function(e){
  if(S.vsRoom&&S.isVs){var key=S.vsIsHost?'host_online':'guest_online',patch={};patch[key]=false;navigator.sendBeacon(SB_URL+'/rest/v1/rooms?id=eq.'+S.vsRoom,JSON.stringify(patch));}
  if(!shouldWarnOnLeave())return;e.preventDefault();e.returnValue='';return '';
});

// ── Events ──
$('save-name')&&$('save-name').addEventListener('keydown',function(e){if(e.key==='Enter')submitScore();});
$('admin-pw')&&$('admin-pw').addEventListener('keydown',function(e){if(e.key==='Enter')checkAdminPw();});
$('qr-join-name-input')&&$('qr-join-name-input').addEventListener('keydown',function(e){if(e.key==='Enter')qrJoinSubmit();});
$('login-name')&&$('login-name').addEventListener('keydown',function(e){if(e.key==='Enter')$('login-pw').focus();});
$('login-pw')&&$('login-pw').addEventListener('keydown',function(e){if(e.key==='Enter')submitLogin();});
$('vs-join-code')&&$('vs-join-code').addEventListener('input',function(e){e.target.value=e.target.value.toUpperCase();});
document.addEventListener('mousemove',function(e){document.documentElement.style.setProperty('--tt-x',e.clientX+'px');document.documentElement.style.setProperty('--tt-y',e.clientY+'px');});
document.addEventListener('contextmenu',function(e){e.preventDefault();});
document.addEventListener('dragstart',function(e){e.preventDefault();});

// ── Init ──
window.addEventListener('load',function(){
  show('start-screen');
  setTimeout(function(){var ses=loadSession();if((!ses.name||!ses.pwHash)&&!S.qrPendingCode&&!$('qr-join-screen').classList.contains('active')&&!$('mp-lobby-screen').classList.contains('active'))openLoginModal();},800);
  setTimeout(function(){$('logo-h1').classList.add('in');},100);
  setTimeout(function(){$('logo-p').classList.add('in');},200);
  setTimeout(function(){$('start-main').classList.add('in');},300);
  setTimeout(function(){renderStreakDisplay('streak-display-start');},400);
  setDailyInfo();getOrCreateDeviceId();refreshAuthUI();checkDeepLink();cleanupStaleRooms();loadDailyBoard();loadDailyChampions();updateDailyPlayAvailability();startDailyTimers();
  loadTotalPoints(); setInterval(loadTotalPoints,10000);
  setTimeout(checkNamePromptNeeded,1500);
});

// ── Changelog ──
var changelogCache=null;

async function loadChangelogEntries(){
  if(changelogCache)return changelogCache;
  try{var data=await sbFetch('wels_changelog_entries?order=date.desc,id.desc&select=*');changelogCache=data||[];return changelogCache;}
  catch(e){return[];}
}

function renderChangelogList(entries){
  var list=$('changelog-list');
  if(!entries||!entries.length){list.innerHTML='<div style="font-size:.7rem;color:var(--mist);text-align:center;padding:2rem">Noch keine Updates eingetragen.</div>';return;}
  list.innerHTML=entries.map(function(e){
    var icon=e.icon||'📋';
    var dateStr=e.date?new Date(e.date).toLocaleDateString('de-AT',{day:'2-digit',month:'long',year:'numeric'}):'';
    var bullets=(e.body||'').split('\n').filter(function(l){return l.trim();}).map(function(l){return '<li>'+escHtml(l.trim())+'</li>';}).join('');
    var imgHtml=e.image?'<img src="'+escHtml(e.image)+'" class="cl-entry-img" onerror="this.style.display=\'none\'">':'';
    var adminBtns=lbAdminMode?'<div class="cl-admin-btns"><button class="cl-edit-btn" onclick="openChangelogEditor(\''+e.id+'\')">✏️ Edit</button><button class="cl-del-btn" onclick="deleteChangelogEntry(\''+e.id+'\')">🗑 Löschen</button></div>':'';
    return '<div class="cl-entry">'+
      '<div class="cl-entry-head">'+
        '<span class="cl-entry-icon">'+icon+'</span>'+
        '<div class="cl-entry-meta">'+
          '<div class="cl-entry-title">'+escHtml(e.title||'Update')+'</div>'+
          '<div class="cl-entry-sub">'+
            (e.version?'<span class="cl-entry-version">'+escHtml(e.version)+'</span>':'')+
            (dateStr?'<span class="cl-entry-date">'+dateStr+'</span>':'')+
          '</div>'+
        '</div>'+adminBtns+
      '</div>'+
      (imgHtml?'<div class="cl-entry-img-wrap">'+imgHtml+'</div>':'')+
      (bullets?'<ul class="cl-entry-body">'+bullets+'</ul>':'')+
    '</div>';
  }).join('');
}

async function openChangelog(){
  $('changelog-admin-bar').style.display=lbAdminMode?'flex':'none';openModal('changelog-modal');
  $('changelog-list').innerHTML='<div style="font-size:.7rem;color:var(--mist);text-align:center;padding:2rem">Lade…</div>';
  var entries=await loadChangelogEntries();renderChangelogList(entries);
}

function openChangelogEditor(id){
  $('cl-edit-error').textContent='';$('cl-edit-id').value=id||'';
  if(id){
    var entry=(changelogCache||[]).find(function(e){return String(e.id)==String(id);});
    if(entry){$('cl-edit-date').value=entry.date||'';$('cl-edit-version').value=entry.version||'';$('cl-edit-icon').value=entry.icon||'';$('cl-edit-title').value=entry.title||'';$('cl-edit-body').value=entry.body||'';$('cl-edit-image').value=entry.image||'';}
  } else {
    $('cl-edit-date').value=new Date().toISOString().slice(0,10);$('cl-edit-version').value='';$('cl-edit-icon').value='🔥';$('cl-edit-title').value='';$('cl-edit-body').value='';$('cl-edit-image').value='';
  }
  openModal('changelog-editor-modal');
}

async function saveChangelogEntry(){
  var id=$('cl-edit-id').value;
  var payload={date:$('cl-edit-date').value||null,version:$('cl-edit-version').value.trim()||null,icon:$('cl-edit-icon').value.trim()||null,title:$('cl-edit-title').value.trim(),body:$('cl-edit-body').value.trim()||null,image:$('cl-edit-image').value.trim()||null};
  if(!payload.title){$('cl-edit-error').textContent='Titel fehlt.';return;}
  try{
    if(id)await sbFetch('wels_changelog_entries?id=eq.'+id,'PATCH',payload);
    else await sbFetch('wels_changelog_entries','POST',payload);
    changelogCache=null;closeModal('changelog-editor-modal');var entries=await loadChangelogEntries();renderChangelogList(entries);
    if(lbAdminMode)$('changelog-admin-bar').style.display='flex';
  }catch(e){$('cl-edit-error').textContent='Fehler beim Speichern.';}
}

async function deleteChangelogEntry(id){
  if(!confirm('Eintrag wirklich löschen?'))return;
  try{await sbFetch('wels_changelog_entries?id=eq.'+id,'DELETE');changelogCache=null;var entries=await loadChangelogEntries();renderChangelogList(entries);}
  catch(e){alert('Fehler beim Löschen.');}
}

// ── ACHIEVEMENTS ──
var ACHIEVEMENTS=[
  {key:'first_game',icon:'🎮',title:'Erster Schritt',desc:'Erstes Spiel gespielt'},
  {key:'first_perfect',icon:'💎',title:'Perfektion',desc:'5000 Punkte in einer Runde'},
  {key:'streak_3',icon:'🔥',title:'Am Laufen',desc:'3 Tage in Folge gespielt'},
  {key:'streak_7',icon:'🔥🔥',title:'Auf Kurs',desc:'7 Tage in Folge gespielt'},
  {key:'streak_30',icon:'👑',title:'Wels-Legende',desc:'30 Tage in Folge gespielt'},
  {key:'score_10k',icon:'⭐',title:'Über 10.000',desc:'10.000+ Punkte in einem Spiel'},
  {key:'score_20k',icon:'🌟',title:'Über 20.000',desc:'20.000+ Punkte in einem Spiel'},
  {key:'score_25k',icon:'🏆',title:'Maximale Leistung',desc:'25.000 Punkte für ein perfektes Spiel'},
  {key:'survival_win',icon:'🌋',title:'Überlebt!',desc:'Alle 12 Hitzewelle-Runden bestanden'},
  {key:'daily_10',icon:'📅',title:'Stammgast',desc:'10 Daily Challenges gespielt'}
];

async function checkAndUnlockAchievements(opts){
  if(!S.isLoggedIn)return;
  var session=loadSession(); if(!session.name)return;
  try{
    var existing=await sbFetch('achievements?player_name=ilike.'+encodeURIComponent(session.name)+'&select=achievement_key');
    var have=new Set((existing||[]).map(function(r){return r.achievement_key;}));
    var toUnlock=[];
    if(opts.firstGame&&!have.has('first_game'))toUnlock.push('first_game');
    if(opts.perfectRound&&!have.has('first_perfect'))toUnlock.push('first_perfect');
    if(opts.streak>=3&&!have.has('streak_3'))toUnlock.push('streak_3');
    if(opts.streak>=7&&!have.has('streak_7'))toUnlock.push('streak_7');
    if(opts.streak>=30&&!have.has('streak_30'))toUnlock.push('streak_30');
    if(opts.totalScore>=10000&&!have.has('score_10k'))toUnlock.push('score_10k');
    if(opts.totalScore>=20000&&!have.has('score_20k'))toUnlock.push('score_20k');
    if(opts.totalScore>=25000&&!have.has('score_25k'))toUnlock.push('score_25k');
    if(opts.survivalWin&&!have.has('survival_win'))toUnlock.push('survival_win');
    if(opts.isDaily&&opts.dailyCount>=10&&!have.has('daily_10'))toUnlock.push('daily_10');
    for(var i=0;i<toUnlock.length;i++){
      var key=toUnlock[i];
      try{await sbFetch('achievements','POST',{player_name:session.name,achievement_key:key});}catch(e){}
      var def=ACHIEVEMENTS.find(function(a){return a.key===key;});
      if(def)showAchievementToast(def);
    }
  }catch(e){}
}

// achievement toast queue
var _achToastQueue=[], _achToastTimer=null;

function showAchievementToast(def){
  _achToastQueue.push(def);
  if(!_achToastTimer) _drainAchQueue();
}

function _drainAchQueue(){
  if(!_achToastQueue.length){ _achToastTimer=null; return; }
  var def=_achToastQueue.shift();
  _playAchievementSound();

  var toast=document.createElement('div');
  toast.className='achievement-toast';
  toast.innerHTML=
    '<span class="ach-toast-icon">'+def.icon+'</span>'+
    '<div><div class="ach-toast-title">'+def.title+'</div>'+
    '<div class="ach-toast-desc">'+def.desc+'</div></div>';
  document.body.appendChild(toast);
  requestAnimationFrame(function(){requestAnimationFrame(function(){toast.classList.add('show');});});
  _achToastTimer=setTimeout(function(){
    toast.classList.remove('show');
    setTimeout(function(){toast.remove();},500);
    _drainAchQueue();
  },3000);
}

function _playAchievementSound(){
  if(VOL===0) return;
  var freq=520;
  tone(freq,'sine',.12,.1);
  tone(freq*1.25,'sine',.09,.07,0,.07);
  tone(freq*1.5,'sine',.07,.05,0,.13);
}

// Entwickler-Erkennung (Accounts mit Entwickler-Badge)
function isDevAccount(){ return !!(S.isLoggedIn && S.loggedInName && S.loggedInName.toLowerCase()==='fabio'); }
// 'W' gedrückt-halten verfolgen (für Entwickler-Cheat in Hitzewelle)
var _wKeyDown=false;
document.addEventListener('keydown',function(e){ if(e.key==='w'||e.key==='W')_wKeyDown=true; });
document.addEventListener('keyup',function(e){ if(e.key==='w'||e.key==='W')_wKeyDown=false; });
window.addEventListener('blur',function(){ _wKeyDown=false; });

// ── MEHR GUESSR DROPDOWN ──
function toggleMehrGuessr(e){
  e.stopPropagation();
  var dd=document.getElementById('mehr-guessr-dropdown');
  if(dd) dd.classList.toggle('open');
}
document.addEventListener('click',function(){
  var dd=document.getElementById('mehr-guessr-dropdown');
  if(dd) dd.classList.remove('open');
});

// ── SCORE CHART ──
function drawScoreChart(){
  var canvas=$('score-chart'); if(!canvas||!S.roundScores.length)return;
  canvas.style.display='block';
  var ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);
  var scores=S.roundScores.map(function(r){return r.pts;});
  var max=Math.max.apply(null,scores.concat([1]));
  var barW=Math.floor((W-40)/scores.length*0.55),gap=Math.floor((W-40)/scores.length);
  var baseY=H-24;
  // grid line at 5000
  var maxLineY=baseY-Math.round((5000/max)*(baseY-8));
  if(max<5000){maxLineY=8;}
  ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(20,maxLineY);ctx.lineTo(W-20,maxLineY);ctx.stroke();
  scores.forEach(function(s,i){
    var x=20+i*gap+gap/2-barW/2;
    var barH=Math.max(4,Math.round((s/max)*(baseY-12)));
    var y=baseY-barH;
    var grad=ctx.createLinearGradient(x,y,x,baseY);
    if(s>=4800){grad.addColorStop(0,'#f0e080');grad.addColorStop(1,'#c9a84c');}
    else if(s>=3000){grad.addColorStop(0,'#e8c86a');grad.addColorStop(1,'#a07830');}
    else if(s>=1000){grad.addColorStop(0,'#8fa89a');grad.addColorStop(1,'#4a6655');}
    else{grad.addColorStop(0,'#c05040');grad.addColorStop(1,'#7a2010');}
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.roundRect(x,y,barW,barH,3);
    ctx.fill();
    // label
    ctx.fillStyle='rgba(245,240,232,0.55)';
    ctx.font='8px DM Mono,monospace';
    ctx.textAlign='center';
    ctx.fillText('R'+(i+1),x+barW/2,baseY+10);
    // score on top
    if(s>0){
      ctx.fillStyle=s>=4800?'#f0e080':s>=3000?'#e8c86a':'rgba(245,240,232,0.6)';
      ctx.font='bold 8px DM Mono,monospace';
      ctx.fillText(s>=1000?Math.round(s/100)/10+'k':s,x+barW/2,y-3);
    }
  });
}

// ── DIFFICULTY RATING ──
var _diffPendingLocId=null, _diffRated=new Set();

// In-Game Schwierigkeits-Badge (wird nach einem Guess sichtbar)
var _diffCurrentLocId=null;
async function loadDifficultyBadge(locId){
  _diffCurrentLocId=locId;
  var el=document.getElementById('top-bar-diff');
  if(!el)return;
  el.textContent=''; el.style.display='none';   // unbestimmt → Label ausblenden, bis echte Bewertung da ist
  try{
    var rows=await sbFetch('location_ratings?location_id=eq.'+encodeURIComponent(locId)+'&select=rating');
    if(!rows||!rows.length){el.style.display='none';return;}
    var avg=rows.reduce(function(a,r){return a+r.rating;},0)/rows.length;
    var labels=['','Sehr einfach','Einfach','Normal','Schwer','Sehr schwer'];
    el.textContent='Schwierigkeit: '+(labels[Math.round(avg)]||'Normal');
    el.style.display='';
  }catch(e){el.style.display='none';}
}

async function loadAndShowDifficultyDisplay(locId){
  var el=$('difficulty-display'); if(!el)return;
  try{
    var rows=await sbFetch('location_ratings?location_id=eq.'+encodeURIComponent(locId)+'&select=rating');
    if(!rows||!rows.length){el.style.display='none';return;}
    var avg=rows.reduce(function(a,r){return a+r.rating;},0)/rows.length;
    var labels=['','Sehr einfach','Einfach','Normal','Schwer','Sehr schwer'];
    var label=labels[Math.round(avg)]||'Normal';
    el.style.display='block';
    el.innerHTML='<div class="diff-display">Schwierigkeit: <span class="diff-label">'+label+'</span> <span class="diff-count">('+rows.length+' Bewertung'+(rows.length===1?'':'en')+')</span></div>';
  }catch(e){el.style.display='none';}
}

function showDifficultyOverlay(locId){
  if(_diffRated.has(locId))return;
  _diffPendingLocId=locId;
  var overlay=$('difficulty-overlay'); if(!overlay)return;
  var stars=overlay.querySelectorAll('.diff-star');
  stars.forEach(function(s){s.classList.remove('active');});
  overlay.classList.add('show');
  stars.forEach(function(star){
    star.onmouseover=function(){
      var r=parseInt(star.getAttribute('data-r'));
      stars.forEach(function(s){s.classList.toggle('hover',parseInt(s.getAttribute('data-r'))<=r);});
    };
    star.onmouseout=function(){stars.forEach(function(s){s.classList.remove('hover');});};
  });
}

function closeDifficultyOverlay(){
  var overlay=$('difficulty-overlay'); if(overlay)overlay.classList.remove('show');
  _diffPendingLocId=null;
}

async function submitDifficultyRating(rating){
  var locId=_diffPendingLocId; if(!locId)return;
  _diffRated.add(locId);
  // Overlay schließen (falls noch offen)
  closeDifficultyOverlay();
  // Inline-Rating ausblenden und bestätigen
  var inlineEl=document.getElementById('inline-diff-rating');
  if(inlineEl){
    inlineEl.innerHTML='<div class="inline-diff-confirmed">Danke! ★</div>';
    setTimeout(function(){inlineEl.style.display='none';},1400);
  }
  tone(660,'sine',.08,.07); tone(880,'sine',.06,.05,0,.07);
  try{
    var name=S.isLoggedIn?S.loggedInName:null;
    if(name){
      await sbFetch('location_ratings?player_name=ilike.'+encodeURIComponent(name)+'&location_id=eq.'+encodeURIComponent(locId),'DELETE').catch(function(){});
    }
    await sbFetch('location_ratings','POST',{location_id:locId,rating:rating,player_name:name||null});
  }catch(e){}
}

// guess in DB speichern (immer, alle modi)
async function saveGuessToDb(locId){
  if(!S.guessLatLng||!S.current)return;
  var name=S.isLoggedIn?S.loggedInName:null;
  sbFetch('wels_daily_guesses','POST',{
    date_key:S.dailyKey||getViennaDateKey(),
    location_id:locId,
    guess_lat:S.guessLatLng.lat,
    guess_lng:S.guessLatLng.lng,
    player_name:name||null
  }).catch(function(){});
}

// zeigt wo alle anderen getippt haben als beschriftete kreise auf der ergebniskarte
async function showOtherGuessesOnResultMap(locId){
  if(!S.resultMap)return;
  try{
    var rows=await sbFetch(
      'wels_daily_guesses?location_id=eq.'+encodeURIComponent(locId)+'&select=guess_lat,guess_lng,player_name&limit=400'
    );
    if(!rows||!rows.length)return;
    rows.forEach(function(row){
      var label=row.player_name||'Anonym';
      L.circleMarker([row.guess_lat,row.guess_lng],{
        radius:5,
        color:'rgba(143,168,154,0.7)',
        fillColor:'rgba(143,168,154,0.35)',
        fillOpacity:1,weight:1.5
      }).addTo(S.resultMap)
        .bindTooltip(label,{sticky:true,className:'hm-tip'});
    });
  }catch(e){}
}

async function openHeatmap(){
  openModal('heatmap-modal');
  setTimeout(async function(){
    if(_heatmapMap){_heatmapMap.remove();_heatmapMap=null;}
    _heatmapMap=L.map('heatmap-el',{center:[47.947,14.358],zoom:13,attributionControl:false,zoomControl:true});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(_heatmapMap);
    setTimeout(function(){if(_heatmapMap)_heatmapMap.invalidateSize();},200);
    try{
      // Alle Guesses laden (kein Datumsfilter) - für immer gespeichert
      var rows=await sbFetch('wels_daily_guesses?select=guess_lat,guess_lng,date_key&limit=2000&order=id.desc');
      if(!rows||!rows.length){
        $('heatmap-hint').textContent='Noch keine Daten vorhanden.';
        return;
      }
      $('heatmap-hint').textContent=rows.length+' Tipps gesamt (· = ein Tipp)';
      var bounds=[];
      // Farbskala nach Datum: neuere = goldfarben, ältere = blaugrün
      var today=getViennaDateKey();
      rows.forEach(function(r){
        var isToday=r.date_key===today;
        var color=isToday?'rgba(201,168,76,0.9)':'rgba(100,160,130,0.65)';
        var fillColor=isToday?'rgba(201,168,76,0.4)':'rgba(100,160,130,0.25)';
        L.circleMarker([r.guess_lat,r.guess_lng],{
          radius:isToday?7:5,color:color,fillColor:fillColor,
          fillOpacity:1,weight:1.5
        }).addTo(_heatmapMap);
        bounds.push([r.guess_lat,r.guess_lng]);
      });
      if(bounds.length)_heatmapMap.fitBounds(L.latLngBounds(bounds).pad(0.3));
    }catch(e){$('heatmap-hint').textContent='Fehler beim Laden.';}
  },300);
}

// ── PROFILE ──
async function openProfile(playerName){
  if($('lb-modal')&&$('lb-modal').classList.contains('open'))closeModal('lb-modal');
  var name=playerName||(S.isLoggedIn?S.loggedInName:null);
  if(!name)return;
  show('profile-screen');
  var _pnd=$('profile-name-display');
  _pnd.textContent=name;
  _pnd.setAttribute('data-spitzname',name);
  _pnd.removeAttribute('data-realname');
  _pnd.style.color='';
  // Entwickler-Badge für Fabio
  var headerEl=document.getElementById('profile-header-info');
  var devBadgeId='dev-badge-fabio';
  var oldBadge=document.getElementById(devBadgeId);
  if(oldBadge)oldBadge.remove();
  if(name.toLowerCase()==='fabio'){
    var devBadge=document.createElement('div');
    devBadge.id=devBadgeId;
    devBadge.className='dev-badge';
    devBadge.textContent='🛠 Entwickler';
    var nameEl=document.getElementById('profile-name-display');
    if(nameEl&&nameEl.parentNode)nameEl.parentNode.insertBefore(devBadge,nameEl.nextSibling);
  }
  $('profile-avatar').textContent=name.charAt(0).toUpperCase();
  $('ps-games').textContent='...';
  $('ps-best').textContent='...';
  $('ps-avg').textContent='...';
  $('ps-streak').textContent='...';
  $('profile-achievements').innerHTML='<div style="font-size:.65rem;color:var(--mist)">Lade...</div>';
  $('profile-recent-scores').innerHTML='';
  try{
    var scores=await sbFetch('wels_scores?name=ilike.'+encodeURIComponent(name)+'&select=score,created_at&order=created_at.desc&limit=50');
    var games=scores?scores.length:0;
    var best=scores&&scores.length?Math.max.apply(null,scores.map(function(r){return r.score;})):0;
    var avg=games?Math.round(scores.reduce(function(a,r){return a+r.score;},0)/games):0;
    $('ps-games').textContent=games;
    $('ps-best').textContent=fmtN(best);
    $('ps-avg').textContent=fmtN(avg);
    var playerRow=await sbFetch('players?name=ilike.'+encodeURIComponent(name)+'&select=streak_count,streak_last_date,created_at');
    if(playerRow&&playerRow.length){
      $('ps-streak').textContent=(playerRow[0].streak_count||0)+' Tage';
      var since=playerRow[0].created_at?new Date(playerRow[0].created_at).toLocaleDateString('de-AT',{day:'2-digit',month:'long',year:'numeric'}):'';
      $('profile-since').textContent=since?'Dabei seit '+since:'';
    }
    // real name hover (separate query so missing columns don't break the profile)
    try{
      var _pinfo=await sbFetch('players?name=ilike.'+encodeURIComponent(name)+'&select=vorname,nachname');
      if(_pinfo&&_pinfo.length&&_pinfo[0].vorname){
        var _rn=_pinfo[0].vorname+(_pinfo[0].nachname?' '+_pinfo[0].nachname:'');
        $('profile-name-display').setAttribute('data-realname',_rn);
      }
    }catch(_){}
    // achievements
    var achRows=await sbFetch('achievements?player_name=ilike.'+encodeURIComponent(name)+'&select=achievement_key,unlocked_at');
    var haveKeys=new Set((achRows||[]).map(function(r){return r.achievement_key;}));
    var achHtml=ACHIEVEMENTS.map(function(a){
      var unlocked=haveKeys.has(a.key);
      return '<div class="ach-item'+(unlocked?' ach-unlocked':' ach-locked')+'">'
        +'<span class="ach-icon">'+a.icon+'</span>'
        +'<div class="ach-info"><div class="ach-title">'+a.title+'</div><div class="ach-desc">'+a.desc+'</div></div>'
        +(unlocked?'<span class="ach-check">✓</span>':'')+'</div>';
    }).join('');
    $('profile-achievements').innerHTML=achHtml?'<div class="ach-grid">'+achHtml+'</div>':'<div style="font-size:.65rem;color:var(--mist)">Noch keine Erfolge.</div>';
    // recent scores
    var recentHtml=(scores||[]).slice(0,10).map(function(r){
      var d=new Date(r.created_at);
      return '<div class="profile-score-row"><span>'+fmtDate(d)+'</span><span class="gold">'+fmtN(r.score)+' Pkt.</span></div>';
    }).join('');
    $('profile-recent-scores').innerHTML=recentHtml||'<div style="font-size:.65rem;color:var(--mist)">Noch keine Spiele.</div>';
  }catch(e){
    $('profile-achievements').innerHTML='<div style="font-size:.65rem;color:#e8826a">Fehler beim Laden.</div>';
  }
}

// ── Extra hooks (no function patching to avoid stack overflow) ──
function afterFinalExtras(){
  drawScoreChart();
  var hb=$('heatmap-btn');
  if(hb)hb.style.display='none';
  // streak für alle modi updaten
  updateStreak(getViennaDateKey()).catch(function(){});
  if(!S.isLoggedIn)return;
  sbFetch('players?name=ilike.'+encodeURIComponent(S.loggedInName)+'&select=streak_count').then(function(r){
    var streak=(r&&r.length)?(r[0].streak_count||0):0;
    var dailyCount=0;
    try{for(var k in localStorage){if(k.startsWith('wg_daily_done_'))dailyCount++;}}catch(e){}
    checkAndUnlockAchievements({
      firstGame:true,
      perfectRound:S.roundScores.some(function(r){return r.pts>=4990;}),
      streak:streak,
      totalScore:S.score,
      survivalWin:S.mode==='survival'&&!S.survivalEliminated&&S.round>=S.roundsTotal-1,
      survivalRound:S.round||0,
      dailyCount:dailyCount,
      minDist:S.minDist,
      nightOwl:(new Date().getHours()>=0&&new Date().getHours()<5),
      vsWin:S.isVs&&S.vsWon,
    });
  }).catch(function(){});
}
function afterGuessExtras(locId){
  saveGuessToDb(locId);
  if(!locId)return;
  setTimeout(function(){
    showOtherGuessesOnResultMap(locId);
    loadAndShowDifficultyDisplay(locId);
    loadDifficultyBadge(locId);
    var inlineRating=document.getElementById('inline-diff-rating');
    if(inlineRating){
      if(_diffRated.has(locId)){
        inlineRating.style.display='none';
      } else {
        inlineRating.style.display='block';
        _diffPendingLocId=locId;
        var stars=inlineRating.querySelectorAll('.diff-star');
        stars.forEach(function(star){
          star.onmouseover=function(){
            var r=parseInt(star.getAttribute('data-r'));
            stars.forEach(function(s){s.classList.toggle('hover',parseInt(s.getAttribute('data-r'))<=r);});
          };
          star.onmouseout=function(){stars.forEach(function(s){s.classList.remove('hover');});};
        });
      }
    }
  },600);
}

// ── Profile name hover (Spitzname ↔ Vorname Nachname) ──
function _wireProfileNameHover(){
  var el=document.getElementById('profile-name-display');
  if(!el||el._hoverWired)return;
  el._hoverWired=true;
  el.addEventListener('mouseenter',function(){
    var rn=this.getAttribute('data-realname');
    if(!rn)return;
    this.textContent=rn;this.style.color='var(--gold)';
  });
  el.addEventListener('mouseleave',function(){
    if(!this.getAttribute('data-realname'))return;
    this.textContent=this.getAttribute('data-spitzname')||'';this.style.color='';
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',_wireProfileNameHover);
else _wireProfileNameHover();
