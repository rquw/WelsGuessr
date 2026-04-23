// ── API config (obfuscated) ──
// Keys are XOR-encoded with 0x5A to avoid plain-text exposure in source
// This is a deterrent layer; for full security, use a backend proxy
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

async function sbFetch(path, method, body) {
  method = method || 'GET';
  var r = await fetch(SB_URL + '/rest/v1/' + path, {
    method: method,
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  var t = await r.text();
  var parsed = t ? JSON.parse(t) : null;
  if (!r.ok) { throw parsed || new Error('Request failed'); }
  return parsed;
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
  $('vol-label').textContent = labels[volIdx];
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
  pin_placed: function(){tone(680,'sine',.04,.08);tone(1020,'sine',.07,.05,0,.02);tone(1360,'sine',.05,.03,0,.04);},
  guess: function(){chord([220,277,330],'sine',.18,.07);chord([330,415,494],'sine',.14,.05,.06);tone(660,'sine',.2,.06,0,.1);},
  roundIntro: function(n){tone(330+n*22,'sine',.1,.09);tone(495+n*33,'sine',.14,.07,0,.07);tone(660+n*44,'sine',.1,.05,0,.13);},
  survivalIntro: function(n){tone(220,'sawtooth',.06,.05);tone(330+n*18,'sine',.12,.09,0,.04);tone(495+n*25,'sine',.16,.07,0,.1);tone(660+n*32,'sine',.12,.05,0,.16);},
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
var MAX_PTS=5000, CENTER=[47.947,14.358], NEXT_AUTO_SECS=20;
var NAME_REGEX=/^[A-Za-z0-9.\-_]+$/;
var _heartbeatListenerAdded = false; // fix: track mousemove listener

var S = {
  round:0, score:0, roundScores:[], locations:[], current:null,
  guessLatLng:null, map:null, resultMap:null, pinMarker:null,
  expanded:false, panoAngle:0, panoZoom:1, isDragging:false, dragStartX:0, dragStartAngle:0,
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
function getStreakData() {
  try {
    var raw = localStorage.getItem('tg_daily_streak');
    if(!raw) return {count:0, lastDate:''};
    return JSON.parse(raw);
  } catch(e) { return {count:0, lastDate:''}; }
}
function updateStreak(dateKey) {
  var data = getStreakData();
  var today = dateKey || getViennaDateKey();
  var yesterday = getYesterdayKey();
  var newCount;
  if(data.lastDate === today) return data.count; // already updated today
  if(data.lastDate === yesterday) newCount = (data.count||0) + 1;
  else newCount = 1; // reset
  var updated = {count:newCount, lastDate:today};
  try { localStorage.setItem('tg_daily_streak', JSON.stringify(updated)); } catch(e){}
  return newCount;
}
function getYesterdayKey() {
  var p = getViennaParts();
  var d = new Date(Date.UTC(p.year, p.month-1, p.day, 12,0,0));
  d.setUTCDate(d.getUTCDate()-1);
  return d.toISOString().slice(0,10);
}
function renderStreakDisplay(containerId) {
  var el = $(containerId);
  if(!el) return;
  var data = getStreakData();
  var streak = data.count || 0;
  if(streak < 2) { el.style.display='none'; return; }
  el.style.display='block';
  el.innerHTML = '<div class="streak-pill"><span class="streak-fire">🔥</span><span class="streak-num">'+streak+'</span><span> Tage in Folge gespielt!</span></div>';
}

// ── Daily Timer ──
function getMsUntilNextDay() {
  var now = new Date();
  var viennaNow = new Date(now.toLocaleString("en-US", {timeZone:"Europe/Vienna"}));
  var next = new Date(viennaNow);
  next.setHours(24,0,0,0);
  return next.getTime() - viennaNow.getTime();
}
function fmtCountdown(ms) {
  if(ms<0) ms=0;
  var s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
}
function startDailyTimers() {
  function tick(){
    var str=fmtCountdown(getMsUntilNextDay());
    var e1=$('menu-daily-timer'), e2=$('daily-screen-timer');
    if(e1) e1.textContent=str;
    if(e2) e2.textContent=str;
  }
  tick();
  if(S.dailyTimerInterval) clearInterval(S.dailyTimerInterval);
  S.dailyTimerInterval=setInterval(tick,1000);
}

// ── Session ──
function saveSession(name,pwHash){try{localStorage.setItem('tg_name',name);localStorage.setItem('tg_ph',pwHash);}catch(e){}}
function loadSession(){try{return{name:localStorage.getItem('tg_name')||'',pwHash:localStorage.getItem('tg_ph')||''};}catch(e){return{name:'',pwHash:''};}}
function clearSession(){try{localStorage.removeItem('tg_name');localStorage.removeItem('tg_ph');}catch(e){}}
function refreshAuthUI(){
  var session=loadSession();
  S.isLoggedIn=!!(session.name&&session.pwHash);
  S.loggedInName=session.name||'';
  S.loggedInPwHash=session.pwHash||'';
  var btn=$('auth-btn');
  if(S.isLoggedIn){
    btn.textContent='Abmelden ('+S.loggedInName+')';
    btn.className='logged-in';
    $('vs-host-name').value=S.loggedInName;
    $('vs-join-name').value=S.loggedInName;
    $('qr-join-name-input').value=S.loggedInName;
  } else {
    btn.textContent='↪ Anmelden';
    btn.className='logged-out';
  }
}
function handleAuthBtn(){if(S.isLoggedIn) showLogoutConfirm(); else openLoginModal();}
function showLogoutConfirm(){$('logout-confirm-overlay').classList.add('show');}
function closeLogoutConfirm(){$('logout-confirm-overlay').classList.remove('show');}
function confirmLogout(){clearSession();refreshAuthUI();closeLogoutConfirm();}

function getOrCreateDeviceId(){
  var id='';
  try{id=localStorage.getItem('tg_device_id')||'';}catch(e){}
  if(!id){
    id=crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2);
    try{localStorage.setItem('tg_device_id',id);}catch(e){}
  }
  return id;
}
function getDailyLocalKey(dateKey){return 'tg_daily_done_'+dateKey;}
function hasPlayedDailyLocally(dateKey){try{return localStorage.getItem(getDailyLocalKey(dateKey))==='1';}catch(e){return false;}}
function markDailyPlayedLocally(dateKey){try{localStorage.setItem(getDailyLocalKey(dateKey),'1');}catch(e){}}
function updateDailyPlayAvailability(){
  var btn=$('daily-play-btn');
  if(!btn) return;
  var already=hasPlayedDailyLocally(getViennaDateKey());
  btn.disabled=already;
  btn.textContent=already?'Heute schon gespielt':'Spielen';
}
function markScoreSavedUI(){
  S.hasSavedThisRun=true;
  var btn=$('save-btn');
  if(!btn) return;
  btn.disabled=true; btn.textContent='✓ Eingetragen!'; btn.classList.add('saved-ok');
}
function resetScoreSavedUI(){
  S.hasSavedThisRun=false;
  var btn=$('save-btn');
  if(!btn) return;
  btn.disabled=false; btn.textContent='Punkte eintragen'; btn.classList.remove('saved-ok');
}
function updateSaveBtnVisibility(){
  var btn=$('save-btn');
  if(!btn) return;
  if(S.isLoggedIn) btn.style.display='none';
  else btn.style.display='';
}

// ── Backdrop ──
function setBackdrop(imgSrc){
  var bd=$('screen-backdrop');
  if(!imgSrc){bd.classList.remove('show');bd.style.backgroundImage='';return;}
  var img=new Image();
  img.onload=function(){bd.style.backgroundImage='url('+imgSrc+')';bd.classList.add('show');};
  img.src=imgSrc;
}
function getRandomLocationImage(){
  if(!Array.isArray(LOCATIONS)||!LOCATIONS.length) return null;
  var loc=LOCATIONS[Math.floor(Math.random()*LOCATIONS.length)];
  return 'images/'+loc.id+'_h000.jpg';
}
function getDailyLocationImage(){
  var key=getViennaDateKey();
  var loc=getDailyLocationForKey(key);
  if(!loc) return getRandomLocationImage();
  return 'images/'+loc.id+'_h000.jpg';
}

// ── Helpers ──
var $=function(id){return document.getElementById(id);};

function show(id){
  document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active','visible');});
  var el=$(id);
  el.classList.add('active');
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
  if(!Array.isArray(LOCATIONS)||!LOCATIONS.length) return;
  var getRand=function(){return LOCATIONS[Math.floor(Math.random()*LOCATIONS.length)];};
  ['solo-card-bg','vs-card-bg','survival-card-bg'].forEach(function(id){
    var el=$(id); if(!el) return;
    el.style.backgroundImage='url(images/'+getRand().id+'_h000.jpg)';
  });
  var dailyBg=$('daily-card-bg');
  if(dailyBg){
    var dloc=getDailyLocationForKey(getViennaDateKey());
    if(dloc) dailyBg.style.backgroundImage='url(images/'+dloc.id+'_h000.jpg)';
  }
  var dpBg=$('daily-preview-bg');
  if(dpBg){
    var dLoc2=getDailyLocationForKey(getViennaDateKey());
    if(dLoc2){
      var src2='images/'+dLoc2.id+'_h000.jpg';
      dpBg.style.backgroundImage='url('+src2+')';
      var img=new Image(); img.onload=function(){dpBg.classList.add('loaded');}; img.src=src2;
    }
  }
}

function openModal(id){
  var bg=$(id); bg.classList.add('open');
  requestAnimationFrame(function(){bg.classList.add('visible');var m=bg.querySelector('.modal');if(m) m.classList.add('in');});
}
function closeModal(id){
  var bg=$(id); bg.classList.remove('visible');
  var m=bg.querySelector('.modal'); if(m) m.classList.remove('in');
  setTimeout(function(){bg.classList.remove('open');},280);
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

// ── FIX: result pin uses street-snapped location ──
// We snap the "actual" marker to the nearest location from LOCATIONS that was used,
// and display the true streetview position. The actual loc.lat/lng IS the streetview position.
// The fix here is to make sure we plot the correct coordinates from the location data.
function getActualLatLng(loc) {
  // Return exact coordinates from location data - these are the streetview positions
  return {lat: loc.lat, lng: loc.lng};
}

function calcPts(d){return Math.round(Math.max(0,MAX_PTS*Math.exp(-d/400)));}
function fmtD(m){return m<1000?Math.round(m)+' m':(m/1000).toFixed(2)+' km';}
function fmtN(n){return Number(n||0).toLocaleString('de');}
function hdg(a){return['N','NO','O','SO','S','SW','W','NW'][Math.round((((a%360)+360)%360)/45)%8];}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function countUp(el,target,dur,onDone){
  dur=dur||900;
  var start=performance.now(),from=parseInt(String(el.textContent).replace(/\D/g,''))||0;
  (function f(now){
    var t=Math.min((now-start)/dur,1),e=1-Math.pow(1-t,3);
    el.textContent=fmtN(Math.round(from+e*(target-from)));
    t<1?requestAnimationFrame(f):(el.textContent=fmtN(target),onDone&&onDone());
  })(performance.now());
}

function getViennaParts(date){
  date=date||new Date();
  var parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(date);
  var out={};
  parts.forEach(function(p){if(p.type!=='literal') out[p.type]=p.value;});
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
  var p=getViennaParts(date);
  var base=new Date(Date.UTC(p.year,p.month-1,p.day,12,0,0));
  var weekday=(base.getUTCDay()+6)%7;
  base.setUTCDate(base.getUTCDate()-weekday);
  return base.toISOString().slice(0,10);
}
function hashStringSimple(str){
  var h=2166136261;
  for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
  return Math.abs(h>>>0);
}
function getDailyLocationForKey(key){
  if(!Array.isArray(LOCATIONS)||!LOCATIONS.length) return null;
  var idx=hashStringSimple('ternberguessr-daily-'+key)%LOCATIONS.length;
  return LOCATIONS[idx];
}

function verdict(p){
  var v=[[4900,'Jap, ich glaub da warst schonmal'],[4700,'Der war gut.'],[4400,'Sehr stark.'],[4000,'Ganz solid.'],[3300,'Ist ok.'],[2500,'Jo.. schaffst bessa.'],[1800,'Da geht mehr.'],[1000,'Irgendwo in Österreich..'],[400,'Der war geraten.'],[100,'Du probierst so wenig Punkte wie möglich zu bekommen oder..?'],[0,'Der wars ned.']];
  for(var i=0;i<v.length;i++){if(p>=v[i][0]) return v[i][1];}
  return 'Ernsthaft?';
}

function randomCode(){
  var c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6},function(){return c[Math.floor(Math.random()*c.length)];}).join('');
}

function showRoundPopup(text,isEmber){
  var el=$('round-popup');
  el.innerHTML=text;
  el.classList.toggle('ember',!!isEmber);
  el.classList.add('show');
  clearTimeout(showRoundPopup._t);
  showRoundPopup._t=setTimeout(function(){el.classList.remove('show');},1050);
}

function setDailyInfo(){
  S.dailyKey=getViennaDateKey();
  S.dailyLocation=getDailyLocationForKey(S.dailyKey);
  $('daily-date-label').textContent=getViennaDisplayDate(S.dailyKey);
  $('daily-board-date').textContent=getViennaDisplayDate(S.dailyKey);
  var monthName=getViennaMonthLabel(new Date());
  monthName=monthName.charAt(0).toUpperCase()+monthName.slice(1);
  $('lb-tab-month').textContent=monthName;
  updateDailyPlayAvailability();
  setMenuCardBackdrops();
}

// ── Navigation ──
function openInfoScreen(){show('info-screen');}
function openPlayMenu(){show('play-menu-screen');setMenuCardBackdrops();startDailyTimers();}
function goToStart(){show('start-screen');renderStreakDisplay('streak-display-start');}
function goToPlayMenu(){show('play-menu-screen');}
function openDailyScreen(){
  setDailyInfo();updateDailyPlayAvailability();
  show('daily-screen');setMenuCardBackdrops();loadDailyBoard();startDailyTimers();
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
    c.style.width=(6+Math.random()*9)+'px';
    c.style.height=(10+Math.random()*15)+'px';
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
  var strip=$('pano-strip');
  strip.innerHTML='';
  $('pano-error').classList.remove('show');
  S.panoLoadFailed=false;
  S.panoZoom=1;
  updatePanoZoom();
  var errors=0;
  [0,90,180,270].forEach(function(h){
    var src='images/'+loc.id+'_h'+String(h).padStart(3,'0')+'.jpg';
    var img=new Image();
    img.src=src;
    img.onerror=function(){errors++;if(errors===4){S.panoLoadFailed=true;setTimeout(function(){skipToNextLocation();},400);}};
  });
  [0,90,180,270,0,90,180,270].forEach(function(h){
    var img=document.createElement('img');
    img.src='images/'+loc.id+'_h'+String(h).padStart(3,'0')+'.jpg';
    img.draggable=false;
    img.oncontextmenu=function(e){e.preventDefault();};
    strip.appendChild(img);
  });
  S.panoAngle=0;
  setTimeout(updatePano,60);
}

function skipToNextLocation(){
  S.skippedLocations.add(S.current.id);
  var used=S.locations.slice(0,S.round+1).map(function(l){return l.id;});
  var unused=LOCATIONS.filter(function(l){return !S.skippedLocations.has(l.id)&&used.indexOf(l.id)===-1;});
  if(unused.length===0){
    // BUG FIX: instead of silently submitting CENTER, show a message and allow skip with 0pts
    $('pano-error').classList.remove('show');
    alert('Keine weiteren Standorte verfügbar. Runde wird mit 0 Punkten übersprungen.');
    var loc=S.current;
    S.guessLatLng={lat:CENTER[0],lng:CENTER[1]};
    submitGuess();
    return;
  }
  var replacement=unused[Math.floor(Math.random()*unused.length)];
  S.locations[S.round]=replacement;
  S.current=replacement;
  loadPano(replacement);
  initGameMap();
}

function updatePano(){
  var strip=$('pano-strip'),hw=strip.scrollWidth/2;
  if(!hw){setTimeout(updatePano,60);return;}
  strip.style.transform='translateX(-'+(((S.panoAngle%360)+360)%360)/360*hw+'px)';
  $('compass').textContent=hdg(S.panoAngle);
}

function updatePanoZoom(){
  var strip=$('pano-strip');
  if(!strip) return;
  strip.style.height=(S.panoZoom*100)+'%';
  strip.style.marginTop=((1-S.panoZoom)/2*100)+'%';
}

function initPanoDrag(){
  var el=$('pano-container');
  el.onmousedown=function(e){
    if(e.button!==0) return;
    resumeAC(); S.isDragging=true; S.dragStartX=e.clientX; S.dragStartAngle=S.panoAngle;
    el.style.cursor='grabbing'; e.preventDefault();
  };
  window.onmousemove=function(e){
    if(!S.isDragging) return;
    var hw=$('pano-strip').scrollWidth/2;
    if(hw) S.panoAngle=S.dragStartAngle-(e.clientX-S.dragStartX)/(hw/S.panoZoom)*360;
    updatePano();
  };
  window.onmouseup=function(){S.isDragging=false;el.style.cursor='grab';};
  el.ontouchstart=function(e){resumeAC();S.isDragging=true;S.dragStartX=e.touches[0].clientX;S.dragStartAngle=S.panoAngle;};
  el.ontouchmove=function(e){
    if(!S.isDragging) return;
    var hw=$('pano-strip').scrollWidth/2;
    if(hw) S.panoAngle=S.dragStartAngle-(e.touches[0].clientX-S.dragStartX)/(hw/S.panoZoom)*360;
    updatePano(); e.preventDefault();
  };
  el.ontouchend=function(){S.isDragging=false;};
  el.style.cursor='grab';
  el.addEventListener('wheel',function(e){
    e.preventDefault();
    var delta=e.deltaY>0?-0.12:0.12;
    S.panoZoom=Math.max(0.5,Math.min(4.0,S.panoZoom+delta));
    updatePanoZoom();
  },{passive:false});
  // Pinch to zoom for mobile
  var _pinchDist=0;
  el.addEventListener('touchstart',function(e){
    if(e.touches.length===2){
      _pinchDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    }
  },{passive:true});
  el.addEventListener('touchmove',function(e){
    if(e.touches.length===2&&_pinchDist>0){
      var dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      var factor=dist/_pinchDist;
      S.panoZoom=Math.max(0.5,Math.min(4.0,S.panoZoom*(0.8+factor*0.2)));
      _pinchDist=dist;
      updatePanoZoom();
      e.preventDefault();
    }
  },{passive:false});
  setTimeout(function(){var h=$('drag-hint');if(h) h.style.opacity='0';},3500);
}

document.addEventListener('mousedown',function(e){
  if(e.button===1&&$('map-panel').contains(e.target)){e.preventDefault();toggleExpand();}
});

// ── Game Map ──
function initGameMap(){
  if(S.map){S.map.remove();S.map=null;}
  var mapBounds=[[47.87,14.20],[48.03,14.54]];
  S.map=L.map('map-el',{center:CENTER,zoom:14,maxBounds:mapBounds,minZoom:12,maxZoom:19,zoomControl:false,attributionControl:false});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,maxNativeZoom:19}).addTo(S.map);
  setTimeout(function(){
    if(!S.map) return;
    S.map.setView(CENTER,14);
    S.map.invalidateSize();
    var corners=[[47.88,14.22],[47.88,14.50],[48.01,14.22],[48.01,14.50]];
    var ci=0;
    var preload=setInterval(function(){
      if(!S.map){clearInterval(preload);return;}
      if(ci<corners.length){S.map.panTo(corners[ci],{animate:false});ci++;}
      else{clearInterval(preload);S.map.setView(CENTER,14,{animate:false});}
    },60);
  },150);
  S.map.on('click',function(e){resumeAC();placePin(e.latlng);});
  S.map.on('mouseover',function(){S.map.invalidateSize();});
  S.pinMarker=null; S.guessLatLng=null;
  $('guess-btn').disabled=true;
  $('pin-hint').textContent='Karte anklicken';
}

// Custom animated pin icon
var _pinIcon=L.divIcon({
  className:'leaflet-pin-icon',
  html:'<div class="map-pin-marker"><div class="map-pin-dot"></div></div>',
  iconSize:[28,36],
  iconAnchor:[14,34],
  popupAnchor:[0,-34]
});

function placePin(ll){
  if(S.pinMarker){S.map.removeLayer(S.pinMarker);}
  S.pinMarker=L.marker(ll,{icon:_pinIcon,draggable:true,autoPan:true}).addTo(S.map);
  // Apply drop animation after element is in DOM
  requestAnimationFrame(function(){
    var el=S.pinMarker.getElement();
    if(el){el.classList.remove('pin-drop');void el.offsetWidth;el.classList.add('pin-drop');}
  });
  S.pinMarker.on('dragend',function(e){
    S.guessLatLng=e.target.getLatLng();
    sfx.pin_placed();
  });
  S.guessLatLng=ll;
  $('guess-btn').disabled=false;
  $('pin-hint').textContent='Pin setzen & ziehen';
  sfx.pin_placed();
}

function clearPin(){
  if(S.pinMarker){S.map.removeLayer(S.pinMarker);S.pinMarker=null;}
  S.guessLatLng=null;
  $('guess-btn').disabled=true;
  $('pin-hint').textContent='Karte anklicken';
}

function toggleExpand(){
  S.expanded=!S.expanded;
  $('map-panel').classList.toggle('expanded',S.expanded);
  setTimeout(function(){if(S.map) S.map.invalidateSize();},260);
}

// ── Game Flow ──
function resetBaseState(){
  S.round=0; S.score=0; S.roundScores=[];
  S.skippedLocations=new Set();
  S.expanded=false; S.vsLeftShown=false;
  S.survivalEliminated=false;
  $('map-panel').classList.remove('expanded');
  S.guessLatLng=null; S.panoAngle=0; S.panoZoom=1;
  $('score-display').textContent='0';
  $('score-verdict').classList.remove('in');
  $('score-verdict').textContent='';
  $('vs-bottom-wait').classList.remove('show');
  $('vs-left-msg').classList.remove('show');
  $('survival-fail-overlay').classList.remove('show');
  $('survival-badge').classList.remove('show');
  $('survival-badge').textContent='';
  clearSubmitCountdown();
  // Reset play-again button
  var pab=$('play-again-btn');
  if(pab){pab.disabled=false;pab.textContent='Nochmal';pab.style.display='';}
  S.myPlayAgainVoted=false; S.playAgainVotes=0;
  $('play-again-vote').style.display='none'; $('play-again-vote').textContent='';
}

function updateSurvivalHUD(){
  var badge=$('survival-badge');
  if(S.mode!=='survival'){badge.classList.remove('show');return;}
  var threshold=getSurvivalThreshold(S.round);
  badge.textContent='🔥 Min. '+fmtN(threshold)+' Pkt. nötig';
  badge.classList.add('show');
}

function startSolo(){
  resetScoreSavedUI(); resumeAC(); sfx.start();
  S.mode='solo'; S.roundsTotal=5;
  resetBaseState(); S.isVs=false;
  if(S.vsPollInterval){clearInterval(S.vsPollInterval);S.vsPollInterval=null;}
  S.locations=shuffle(LOCATIONS.slice()).slice(0,S.roundsTotal);
  $('vs-badge').style.display='none';
  $('vs-strip').style.display='none';
  $('round-total').textContent=S.roundsTotal;
  show('game-screen'); initPanoDrag(); loadRound();
}

function startSurvival(){
  resetScoreSavedUI(); resumeAC(); sfx.start();
  S.mode='survival'; S.roundsTotal=SURVIVAL_ROUNDS;
  resetBaseState(); S.isVs=false;
  if(S.vsPollInterval){clearInterval(S.vsPollInterval);S.vsPollInterval=null;}
  S.locations=shuffle(LOCATIONS.slice()).slice(0,SURVIVAL_ROUNDS);
  $('vs-badge').style.display='none';
  $('vs-strip').style.display='none';
  $('round-total').textContent=SURVIVAL_ROUNDS;
  show('game-screen'); initPanoDrag(); loadRound();
}

function startDailyChallenge(){
  var todayKey=getViennaDateKey();
  if(hasPlayedDailyLocally(todayKey)){alert('Du hast die tägliche Challenge auf diesem Gerät heute schon gespielt.');return;}
  resetScoreSavedUI(); resumeAC(); sfx.start();
  S.mode='daily'; S.roundsTotal=1;
  resetBaseState(); S.isVs=false;
  if(S.vsPollInterval){clearInterval(S.vsPollInterval);S.vsPollInterval=null;}
  S.dailyKey=todayKey;
  S.dailyLocation=getDailyLocationForKey(S.dailyKey);
  S.locations=[S.dailyLocation];
  $('vs-badge').style.display='none';
  $('vs-strip').style.display='none';
  $('round-total').textContent='1';
  show('game-screen'); initPanoDrag(); loadRound();
}

// ── Survival round intro overlay ──
function buildFlamesSVG(svg, count){
  svg.innerHTML='';
  var W=400,H=200;
  var colors=[['#f07d4a','#e05c2a','#c93a10'],['#f5a060','#e87030','#d04520'],['#ff9944','#e86020','#c03a10']];
  for(var i=0;i<count;i++){
    var x=10+Math.random()*380, baseH=60+Math.random()*120, w=18+Math.random()*32;
    var cx=colors[Math.floor(Math.random()*colors.length)];
    var gradId='fg'+i;
    var defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
    var grad=document.createElementNS('http://www.w3.org/2000/svg','radialGradient');
    grad.setAttribute('id',gradId); grad.setAttribute('cx','50%'); grad.setAttribute('cy','80%');
    grad.setAttribute('r','60%'); grad.setAttribute('gradientUnits','userSpaceOnUse');
    [[0,cx[0],'1'],[.5,cx[1],'0.7'],[1,cx[2],'0']].forEach(function(s){
      var stop=document.createElementNS('http://www.w3.org/2000/svg','stop');
      stop.setAttribute('offset',s[0]); stop.setAttribute('stop-color',s[1]); stop.setAttribute('stop-opacity',s[2]);
      grad.appendChild(stop);
    });
    defs.appendChild(grad); svg.appendChild(defs);
    // flame shape: bezier teardrop
    var hh=baseH, hw=w/2;
    var d='M'+x+','+H+
      ' C'+(x-hw)+','+(H-hh*.3)+' '+(x-hw*.5)+','+(H-hh*.7)+' '+x+','+(H-hh)+
      ' C'+(x+hw*.5)+','+(H-hh*.7)+' '+(x+hw)+','+(H-hh*.3)+' '+x+','+H+'Z';
    var path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',d); path.setAttribute('fill','url(#'+gradId+')');
    path.setAttribute('class','flame-path');
    path.style.setProperty('--fd',(1.4+Math.random()*.9)+'s');
    path.style.setProperty('--fo',(.5+Math.random()*.4)+'');
    path.style.animationDelay=(Math.random()*.8)+'s';
    svg.appendChild(path);
  }
}

function showSurvivalRoundIntro(roundNum, threshold, onDone){
  var overlay=$('survival-intro-overlay');
  $('survival-intro-round-num').textContent=roundNum+' / '+SURVIVAL_ROUNDS;
  $('survival-intro-threshold-num').textContent=fmtN(threshold)+' Pkt.';
  buildFlamesSVG($('survival-flames-svg'), 22);
  overlay.classList.add('show');
  // Re-trigger content animation
  var c=$('survival-intro-content');
  c.style.animation='none'; void c.offsetWidth; c.style.animation='';
  clearTimeout(showSurvivalRoundIntro._t);
  showSurvivalRoundIntro._t=setTimeout(function(){
    overlay.classList.remove('show');
    if(onDone) onDone();
  },1800);
}

// ── Survival score reveal overlay ──
function showSurvivalScoreReveal(pts, threshold, onDone){
  var overlay=$('survival-score-overlay');
  var canvas=$('survival-score-canvas');
  var numEl=$('survival-score-num');
  var barFill=$('survival-score-bar-fill');
  var marker=$('survival-score-threshold-marker');
  var verdict=$('survival-score-verdict');
  var thresholdLabelBar=$('survival-score-threshold-label-bar');

  var passed=(pts>=threshold);
  numEl.textContent='0';
  numEl.className='';
  barFill.style.width='0%';
  barFill.className='';
  verdict.className='';
  verdict.textContent='';

  // threshold marker position (0-5000 scale)
  var markerPct=Math.min(threshold/5000*100,100);
  marker.style.left=markerPct+'%';
  thresholdLabelBar.textContent=fmtN(threshold);

  // spawn flame particles
  _spawnScoreFlames(overlay, canvas, passed);

  overlay.classList.add('show');

  // count up pts over exactly 2s
  var startTime=performance.now();
  var DUR=2000;
  var startPts=0;
  function tick(now){
    var t=Math.min((now-startTime)/DUR,1);
    var ease=1-Math.pow(1-t,3);
    var cur=Math.round(startPts+ease*(pts-startPts));
    numEl.textContent=fmtN(cur);

    // bar fills proportionally
    var pct=Math.min(cur/5000*100,100);
    barFill.style.width=pct+'%';

    // colour flip when threshold crossed
    var crossedThreshold=(cur>=threshold);
    if(crossedThreshold && !barFill.classList.contains('passed')){
      barFill.classList.add('passed');
      numEl.classList.add('passed');
      _extinguishFlames(overlay);
    }

    if(t<1){ requestAnimationFrame(tick); }
    else{
      numEl.textContent=fmtN(pts);
      barFill.style.width=Math.min(pts/5000*100,100)+'%';
      if(passed){
        numEl.classList.add('passed');
        barFill.classList.add('passed');
        verdict.textContent='Schwelle geschafft! 🔥';
        verdict.classList.add('show','passed');
      } else {
        numEl.classList.add('failed');
        verdict.textContent='Ausgeschieden.';
        verdict.classList.add('show','failed');
      }
      sfx[passed?'good':'eliminated']&&sfx[passed?'good':'eliminated']();
      setTimeout(function(){
        overlay.classList.remove('show');
        _clearScoreFlames(overlay);
        if(onDone) onDone();
      }, passed?1600:2200);
    }
  }
  setTimeout(function(){requestAnimationFrame(tick);},200);
}

var _scoreFlameEls=[];
function _spawnScoreFlames(overlay, canvas, passed){
  _clearScoreFlames(overlay);
  var colors=passed
    ?['#f5d060','#e8c060','#c9a84c']
    :['#e05c2a','#f07d4a','#c03a10','#ff9944'];
  var count=28;
  for(var i=0;i<count;i++){
    var el=document.createElement('div');
    el.className='ss-flame';
    var w=20+Math.random()*50;
    var h=-(80+Math.random()*220);
    el.style.setProperty('--fw',w+'px');
    el.style.setProperty('--fh',h+'px');
    el.style.setProperty('--fc',colors[Math.floor(Math.random()*colors.length)]);
    el.style.setProperty('--fdd',(1.4+Math.random()*1.6)+'s');
    el.style.setProperty('--fdel',(Math.random()*1.2)+'s');
    el.style.left=(Math.random()*100)+'%';
    el.style.height=w+'px';
    overlay.appendChild(el);
    _scoreFlameEls.push(el);
  }
}
function _extinguishFlames(overlay){
  // fade out existing flames fast
  _scoreFlameEls.forEach(function(el){
    el.style.transition='opacity .6s ease';
    el.style.opacity='0';
  });
}
function _clearScoreFlames(overlay){
  _scoreFlameEls.forEach(function(el){if(el.parentNode) el.parentNode.removeChild(el);});
  _scoreFlameEls=[];
}

function loadRound(){
  S.current=S.locations[S.round];
  $('round-num').textContent=S.round+1;
  $('score-display').textContent=fmtN(S.score);
  hideSkipPanoBtn();
  if(S.isVs) setTimeout(showSkipPanoBtn,1200);
  var f=$('round-flash');
  f.classList.remove('ember-flash');
  if(S.mode==='survival') f.classList.add('ember-flash');
  f.classList.add('on');
  setTimeout(function(){f.classList.remove('on');},180);
  if(S.mode==='survival'){
    sfx.survivalIntro(S.round+1);
    updateSurvivalHUD();
    var threshold=getSurvivalThreshold(S.round);
    // Show big intro overlay, then load pano/map behind it
    loadPano(S.current); initGameMap();
    showSurvivalRoundIntro(S.round+1, threshold, null);
  } else {
    sfx.roundIntro(S.round+1);
    showRoundPopup('Runde <span>'+(S.round+1)+'/'+S.roundsTotal+'</span>');
    loadPano(S.current); initGameMap();
  }
}

function submitGuess(){
  if(!S.guessLatLng) return;
  sfx.guess();
  var loc=S.current;
  var actual=getActualLatLng(loc); // use correct coords
  var dist=haversine(S.guessLatLng.lat,S.guessLatLng.lng,actual.lat,actual.lng);
  var pts=calcPts(dist);
  S.score+=pts;
  S.roundScores.push({round:S.round+1,dist:dist,pts:pts});
  $('res-dist').textContent=fmtD(dist);
  $('res-pts').textContent='0';
  $('res-total').textContent=fmtN(S.score);
  var isLast=S.round>=S.roundsTotal-1;
  $('next-btn').textContent=(isLast?'Ergebnis sehen →':'Nächste Runde →')+' ';
  var kbdSpan=document.createElement('span');
  kbdSpan.className='kbd-hint'; kbdSpan.textContent='SPACE';
  $('next-btn').appendChild(kbdSpan);
  $('next-btn').disabled=false;
  $('score-verdict').textContent=''; $('score-verdict').classList.remove('in');
  $('vs-their-guess-row').style.display='none';
  $('next-vote-bar').classList.remove('show'); $('next-vote-bar').textContent='';
  S.myNextVoted=false; S.nextVotes=0;
  $('vs-bottom-wait').classList.remove('show');
  var survivalThresholdEl=$('survival-threshold-row');
  survivalThresholdEl.classList.remove('show');
  if(S.mode==='survival'){
    var threshold=getSurvivalThreshold(S.round);
    if(pts<threshold){
      S.survivalEliminated=true;
      survivalThresholdEl.textContent='🔥 Elimination! Du hattest '+fmtN(pts)+' Punkte, brauchtest '+fmtN(threshold)+'.';
      survivalThresholdEl.classList.add('show');
      $('next-btn').textContent='Endstand sehen';
    } else {
      survivalThresholdEl.textContent='✓ Schwelle geschafft! ('+fmtN(pts)+' / '+fmtN(threshold)+' nötig)';
      survivalThresholdEl.classList.add('show');
    }
  }
  if(S.isVs){pushVsScore(pts,S.guessLatLng);showVsWaitOverlay(true);$('vs-bottom-wait').classList.add('show');startSpectatePoll();startSubmitCountdown();}

  if(S.mode==='survival'){
    // Show full-screen score reveal overlay first, THEN go to result screen
    showSurvivalScoreReveal(pts, getSurvivalThreshold(S.round), function(){
      show('result-screen');
      initResultMap(loc,S.guessLatLng);
      ['stat-dist','stat-pts','stat-total'].forEach(function(id,i){
        var el=$(id); el.classList.remove('in');
        setTimeout(function(){el.classList.add('in');},120+i*80);
      });
      $('res-pts').textContent=fmtN(pts);
      var v=$('score-verdict'); v.textContent=verdict(pts); v.classList.add('in');
    });
    return;
  }

  show('result-screen');
  initResultMap(loc,S.guessLatLng);
  ['stat-dist','stat-pts','stat-total'].forEach(function(id,i){
    var el=$(id); el.classList.remove('in');
    setTimeout(function(){el.classList.add('in');},120+i*80);
  });
  setTimeout(function(){
    countUp($('res-pts'),pts,900,function(){
      playScoreSfx(pts);
      var v=$('score-verdict'); v.textContent=verdict(pts); v.classList.add('in');
      if(!S.isVs) updateVsStrip();
      if(S.mode==='survival'&&S.survivalEliminated) setTimeout(function(){sfx.eliminated();},300);
    });
  },350);
}

function initResultMap(loc,guess){
  if(S.resultMap){S.resultMap.remove();S.resultMap=null;}
  var actual=getActualLatLng(loc);
  S.resultMap=L.map('result-map-el',{
    center:[(actual.lat+guess.lat)/2,(actual.lng+guess.lng)/2],
    zoom:14,zoomControl:true,attributionControl:false
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(S.resultMap);
  // FIX: "Tatsächlich" marker now shows the actual streetview location
  L.circleMarker([actual.lat,actual.lng],{radius:11,color:'#4a8c62',fillColor:'#4a8c62',fillOpacity:1,weight:2})
    .addTo(S.resultMap).bindTooltip('Tatsächlich',{permanent:true,direction:'top'});
  L.circleMarker([guess.lat,guess.lng],{radius:9,color:'#c9a84c',fillColor:'#c9a84c',fillOpacity:1,weight:2})
    .addTo(S.resultMap).bindTooltip('Dein Tipp',{permanent:true,direction:'top'});
  L.polyline([[actual.lat,actual.lng],[guess.lat,guess.lng]],{color:'#c9a84c',dashArray:'5 4',weight:2,opacity:.65}).addTo(S.resultMap);
  S.resultMap.fitBounds(L.latLngBounds([[actual.lat,actual.lng],[guess.lat,guess.lng]]).pad(.5));
}

function nextRound(){
  sfx.next();
  clearNextVoteTimers();
  hideVsWaitOverlay();
  stopSpectatePoll();
  $('vs-bottom-wait').classList.remove('show');
  if(S.mode==='survival'&&S.survivalEliminated){showSurvivalFail();return;}
  S.round++;
  if(S.round>=S.roundsTotal) showFinal();
  else{show('game-screen');loadRound();}
}

function showSurvivalFail(){
  var roundsCompleted=S.round;
  $('sf-round-label').textContent='Du bist in Runde '+(roundsCompleted+1)+' rausgeflogen.';
  $('sf-score-label').textContent=fmtN(S.score)+' Punkte gesamt';
  $('sf-pts-label').textContent='Runden bestanden: '+roundsCompleted+' / '+SURVIVAL_ROUNDS;
  $('survival-fail-overlay').classList.add('show');
}

function showFinal(){
  sfx.final(S.score);
  show('final-screen');
  $('final-score-num').textContent='0';
  var modeLabel={daily:'Tägliche Challenge beendet',survival:'🔥 Hitzewelle bestanden!',solo:'Spiel beendet',vs:'Spiel beendet'};
  $('final-title').textContent=modeLabel[S.mode]||'Spiel beendet';
  var maxPossible=S.roundsTotal*MAX_PTS;
  $('final-sub-label').textContent=S.mode==='daily'?'/ 5 000 Punkte':'/ '+fmtN(maxPossible)+' Punkte';
  $('vs-result-box').classList.remove('show');
  S.myPlayAgainVoted=false; S.playAgainVotes=0;
  $('play-again-vote').style.display='none'; $('play-again-vote').textContent='';
  $('play-again-btn').disabled=false;
  $('play-again-btn').textContent='Nochmal';
  $('play-again-btn').style.display=S.mode==='daily'?'none':'';
  $('share-btn').style.display='block'; // always show share
  resetScoreSavedUI();
  if(S.mode==='survival') launchConfetti(120);
  setTimeout(function(){countUp($('final-score-num'),S.score,1200);},300);
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
  if(S.isVs) showVsFinalResult();
  // streak update for daily
  if(S.mode==='daily') updateStreak(S.dailyKey);
  if(S.isLoggedIn&&!S.hasSavedThisRun){
    S.pendingSaveTarget=S.mode==='daily'?'daily':'global';
    setTimeout(function(){autoSaveLoggedInUser();},800);
  }
  updateSaveBtnVisibility();
}

// ── Share Result Card ──
function shareResult(){
  var canvas=$('share-canvas');
  var ctx=canvas.getContext('2d');
  var W=1080, H=540;
  canvas.width=W; canvas.height=H;

  // background gradient
  var grad=ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,'#13271a');
  grad.addColorStop(0.5,'#1a3322');
  grad.addColorStop(1,'#17311f');
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,W,H);

  // decorative circles
  ctx.save();
  ctx.globalAlpha=0.08;
  ctx.fillStyle='#c9a84c';
  ctx.beginPath(); ctx.arc(W*0.85,H*0.2,180,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#4a8c62';
  ctx.beginPath(); ctx.arc(W*0.12,H*0.8,140,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // border
  ctx.strokeStyle='rgba(201,168,76,0.35)';
  ctx.lineWidth=2;
  ctx.strokeRect(20,20,W-40,H-40);

  // title
  ctx.fillStyle='rgba(245,240,232,0.5)';
  ctx.font='500 22px "DM Mono", monospace';
  ctx.letterSpacing='4px';
  ctx.fillText('TERNBERGUESSR', 60, 80);

  // mode label
  var modeLabels={solo:'Einzelspieler',vs:'1v1',daily:'Tägliche Challenge',survival:'🔥 Hitzewelle'};
  ctx.fillStyle='rgba(201,168,76,0.7)';
  ctx.font='18px "DM Mono", monospace';
  ctx.fillText(modeLabels[S.mode]||'', 60, 120);

  // big score
  ctx.fillStyle='#c9a84c';
  ctx.font='bold 140px "Playfair Display", serif';
  ctx.fillText(fmtN(S.score), 60, 290);

  // subline
  var maxPts=S.roundsTotal*MAX_PTS;
  ctx.fillStyle='rgba(245,240,232,0.45)';
  ctx.font='22px "DM Mono", monospace';
  ctx.fillText('/ '+fmtN(maxPts)+' Punkte', 60, 340);

  // round breakdown (small)
  ctx.fillStyle='rgba(143,168,154,0.7)';
  ctx.font='16px "DM Mono", monospace';
  var bx=60, by=390;
  S.roundScores.forEach(function(r,i){
    if(i<5){ // max 5 rows
      var failed=S.mode==='survival'&&r.pts<getSurvivalThreshold(i);
      ctx.fillStyle=failed?'rgba(224,92,42,0.7)':'rgba(143,168,154,0.7)';
      ctx.fillText('R'+r.round+' · '+fmtD(r.dist)+' · '+fmtN(r.pts)+' Pkt.',bx,by+i*26);
    }
  });

  // date
  ctx.fillStyle='rgba(143,168,154,0.45)';
  ctx.font='15px "DM Mono", monospace';
  ctx.textAlign='right';
  ctx.fillText(getViennaDisplayDate(getViennaDateKey()),W-60,H-40);
  ctx.textAlign='left';

  // try share API
  canvas.toBlob(function(blob){
    if(!blob) return;
    var file=new File([blob],'ternberguessr-ergebnis.png',{type:'image/png'});
    var shareData={title:'TernberGuessr Ergebnis',text:'Ich habe '+fmtN(S.score)+' Punkte bei TernberGuessr! 🌍 Kannst du das toppen?',files:[file]};
    if(navigator.share&&navigator.canShare&&navigator.canShare(shareData)){
      navigator.share(shareData).catch(function(){downloadShareImage(canvas);});
    } else {
      downloadShareImage(canvas);
    }
  },'image/png');
}

function downloadShareImage(canvas){
  var a=document.createElement('a');
  a.download='ternberguessr-ergebnis.png';
  a.href=canvas.toDataURL('image/png');
  a.click();
}

// ── Leaderboard ──
var lbAdminMode=false;
var lbLKeyCount=0, lbLKeyTimer=null;

document.addEventListener('keydown',function(e){
  if((e.key==='l'||e.key==='L')&&$('lb-modal').classList.contains('open')){
    lbLKeyCount++;
    clearTimeout(lbLKeyTimer);
    lbLKeyTimer=setTimeout(function(){lbLKeyCount=0;},2500);
    if(lbLKeyCount>=5){lbLKeyCount=0;openAdminFromLb();}
  }
});

function openAdminFromLb(){closeModal('lb-modal');openModal('admin-modal');setTimeout(function(){$('admin-pw').focus();},300);}
function checkAdminPw(){
  if($('admin-pw').value==='0907'){
    lbAdminMode=true; $('admin-pw').value='';
    closeModal('admin-modal'); openLeaderboard(); $('lb-admin-hint').textContent='Admin-Modus aktiv';
  } else {$('admin-error').textContent='Falsches Passwort.';}
}

function setLeaderboardTab(tab){
  S.leaderboardTab=tab;
  ['week','month','all'].forEach(function(t){$('lb-tab-'+t).classList.toggle('active',t===tab);});
  loadLeaderboardData();
}
function setLbSort(sort){
  S.lbSort=sort;
  $('lb-sort-pts').classList.toggle('active',sort==='pts');
  $('lb-sort-date').classList.toggle('active',sort==='date');
  loadLeaderboardData();
}
function openLeaderboard(){openModal('lb-modal');loadLeaderboardData();}

var lbExpandedNames={};
var lbSubSort={};

async function loadLeaderboardData(){
  $('lb-list').innerHTML='<div style="font-size:.7rem;color:var(--mist);text-align:center;padding:1rem">Lade…</div>';
  try{
    var path='scores?select=id,name,score,created_at';
    if(S.leaderboardTab==='week') path+='&created_at=gte.'+getWeekStartKeyVienna()+'T00:00:00';
    else if(S.leaderboardTab==='month'){
      var p=getViennaParts();
      path+='&created_at=gte.'+p.year+'-'+String(p.month).padStart(2,'0')+'-01T00:00:00';
    }
    path+='&order=score.desc&limit=200';
    var rows=await sbFetch(path);
    if(!rows||rows.length===0){
      $('lb-list').innerHTML='<div style="font-size:.7rem;color:var(--mist);text-align:center;padding:1rem">Noch keine Einträge.</div>';
      return;
    }
    $('lb-list').innerHTML='';
    lbAdminMode?$('lb-list').classList.add('admin-mode'):$('lb-list').classList.remove('admin-mode');
    var playerBest={},playerAll={};
    rows.forEach(function(r){
      if(!r.name) return;
      var key=r.name.toLowerCase();
      if(!playerBest[key]){playerBest[key]=r;playerAll[key]=[];}
      playerAll[key].push(r);
      if(r.score>playerBest[key].score) playerBest[key]=r;
    });
    var players=Object.keys(playerBest).map(function(k){return playerBest[k];});
    if(S.lbSort==='date') players.sort(function(a,b){return new Date(b.created_at)-new Date(a.created_at);});
    else players.sort(function(a,b){return b.score-a.score;});
    players=players.slice(0,50);
    if(!players.length){
      $('lb-list').innerHTML='<div style="font-size:.7rem;color:var(--mist);text-align:center;padding:1rem">Noch keine Einträge.</div>';
      return;
    }
    var medals=['🥇','🥈','🥉'];
    players.forEach(function(r,i){
      var nameKey=r.name.toLowerCase();
      var allScores=playerAll[nameKey]||[];
      var wrap=document.createElement('div');
      wrap.style.cssText='display:flex;flex-direction:column;border-radius:8px;overflow:hidden';
      var rankLabel=(S.lbSort==='pts'&&i<3)?'<span class="lb-rank gold">'+medals[i]+'</span>':'<span class="lb-rank">'+(i+1)+'</span>';
      var d=new Date(r.created_at);
      var date=d.toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit',year:'numeric'});
      var timeStr=d.toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit'});
      var multiHint=allScores.length>1?' <span style="font-size:.55rem;color:var(--mist);">('+allScores.length+')</span>':'';
      var rowEl=document.createElement('div');
      rowEl.className='lb-row'; rowEl.style.borderRadius='0';
      rowEl.innerHTML=rankLabel+'<span class="lb-name">'+escHtml(r.name)+multiHint+'</span><span class="lb-score">'+fmtN(r.score)+'</span><span class="lb-date" data-time="'+timeStr+'">'+date+'</span>';
      if(lbAdminMode){
        var delBtn=document.createElement('button');
        delBtn.className='lb-del'; delBtn.textContent='✕';
        delBtn.setAttribute('data-id',r.id);
        delBtn.onclick=function(e){
          e.stopPropagation();
          deleteLbEntry(this.getAttribute('data-id'),this.closest('[style*="flex-direction"]')||this.parentElement.parentElement);
        };
        rowEl.appendChild(delBtn);
      }
      var subList=document.createElement('div');
      subList.className='lb-player-scores';
      if(lbExpandedNames[nameKey]) subList.classList.add('open');
      if(allScores.length>1){
        var curSubSort=lbSubSort[nameKey]||'pts';
        var sortRow=document.createElement('div'); sortRow.className='lb-sub-sort-row';
        sortRow.innerHTML='<button class="lb-sub-sort-btn'+(curSubSort==='pts'?' active':'')+'" data-player="'+nameKey+'" data-sort="pts">◆ Punkte</button><button class="lb-sub-sort-btn'+(curSubSort==='date'?' active':'')+'" data-player="'+nameKey+'" data-sort="date">📅 Datum</button>';
        sortRow.querySelectorAll('.lb-sub-sort-btn').forEach(function(btn){
          btn.onclick=function(e){
            e.stopPropagation();
            var player=btn.getAttribute('data-player'), sortVal=btn.getAttribute('data-sort');
            lbSubSort[player]=sortVal;
            renderSubScores(subList,playerAll[player],sortVal);
            sortRow.querySelectorAll('.lb-sub-sort-btn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-sort')===sortVal);});
            tone(sortVal==='pts'?660:440,'sine',.06,.07);
          };
        });
        subList.appendChild(sortRow);
        renderSubScores(subList,allScores,curSubSort);
        rowEl.querySelector('.lb-name').onclick=function(e){
          e.stopPropagation();
          var isOpen=subList.classList.contains('open');
          subList.classList.toggle('open',!isOpen);
          lbExpandedNames[nameKey]=!isOpen;
          tone(isOpen?440:660,'sine',.06,.07);
        };
      }
      wrap.appendChild(rowEl); wrap.appendChild(subList);
      $('lb-list').appendChild(wrap);
      setTimeout(function(){rowEl.classList.add('in');},i*45);
    });
  } catch(e){
    $('lb-list').innerHTML='<div style="font-size:.7rem;color:#e8826a;text-align:center;padding:1rem">Fehler beim Laden.</div>';
    console.error('Leaderboard error:',e);
  }
}

function renderSubScores(container,scores,sortMode){
  Array.from(container.querySelectorAll('.lb-sub-score')).forEach(function(el){el.remove();});
  var sorted=scores.slice();
  if(sortMode==='date') sorted.sort(function(a,b){return new Date(b.created_at)-new Date(a.created_at);});
  else sorted.sort(function(a,b){return b.score-a.score;});
  sorted.forEach(function(sc){
    var sd=new Date(sc.created_at);
    var sdate=sd.toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit',year:'numeric'});
    var stime=sd.toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit'});
    var sub=document.createElement('div'); sub.className='lb-sub-score';
    sub.innerHTML='<span>'+sdate+' '+stime+'</span><span>'+fmtN(sc.score)+'</span>';
    container.appendChild(sub);
  });
}

async function deleteLbEntry(id,wrap){
  try{await sbFetch('scores?id=eq.'+id,'DELETE');if(wrap) wrap.remove();tone(300,'sawtooth',.1,.06);}
  catch(e){alert('Fehler beim Löschen: '+(e&&e.message?e.message:JSON.stringify(e)));}
}

// ── Login Modal ──
var loginMode='existing';
var loginNameCheckTimer=null;

function openLoginModal(){
  loginMode='existing';
  $('login-toggle-no').classList.remove('active');
  $('login-toggle-yes').classList.add('active');
  $('login-name').value=''; $('login-pw').value='';
  $('login-error').textContent=''; $('login-name-avail').textContent='';
  $('login-pw-hint').textContent='Dein bisheriges Passwort.';
  openModal('login-modal');
  setTimeout(function(){$('login-name').focus();},200);
}

function setLoginMode(mode){
  loginMode=mode;
  $('login-toggle-no').classList.toggle('active',mode==='new');
  $('login-toggle-yes').classList.toggle('active',mode==='existing');
  $('login-name-avail').textContent=''; $('login-error').textContent='';
  $('login-pw-hint').textContent=mode==='new'?'Erstellt deinen Account. Merke dir das Passwort!':'Dein bisheriges Passwort.';
}

$('login-name')&&$('login-name').addEventListener('input',function(){
  var name=$('login-name').value.trim();
  $('login-error').textContent='';
  if(loginMode!=='new'){$('login-name-avail').textContent='';return;}
  if(!name||!NAME_REGEX.test(name)){$('login-name-avail').textContent=name?'Nur Buchstaben, Zahlen, . - _ erlaubt.':'';$('login-name-avail').className='name-avail'+(name?' taken':'');return;}
  clearTimeout(loginNameCheckTimer);
  $('login-name-avail').textContent='Prüfe…'; $('login-name-avail').className='name-avail checking';
  loginNameCheckTimer=setTimeout(async function(){
    try{
      var rows=await sbFetch('players?name=ilike.'+encodeURIComponent(name)+'&select=id');
      if(rows&&rows.length){$('login-name-avail').textContent='Vergeben.';$('login-name-avail').className='name-avail taken';}
      else{$('login-name-avail').textContent='Verfügbar!';$('login-name-avail').className='name-avail ok';}
    }catch(e){$('login-name-avail').textContent='';}
  },350);
});

async function submitLogin(){
  var name=$('login-name').value.trim(), pw=$('login-pw').value;
  if(!name||!pw){$('login-error').textContent='Bitte Name und Passwort eingeben.';return;}
  if(!NAME_REGEX.test(name)){$('login-error').textContent='Name: nur Buchstaben, Zahlen, . - _ erlaubt.';return;}
  $('login-error').textContent=''; $('login-submit-btn').disabled=true;
  try{
    var inputHash=await hashString(pw);
    var existing=await sbFetch('players?name=ilike.'+encodeURIComponent(name)+'&select=id,name,pw_hash');
    if(loginMode==='new'){
      if(existing&&existing.length){$('login-error').textContent='Name vergeben.';$('login-submit-btn').disabled=false;return;}
      await sbFetch('players','POST',{name:name,pw_hash:inputHash});
      saveSession(name,inputHash); refreshAuthUI();
    } else {
      if(!existing||!existing.length){$('login-error').textContent='Account nicht gefunden.';$('login-submit-btn').disabled=false;return;}
      if(existing[0].pw_hash!==inputHash){$('login-error').textContent='Falsches Passwort.';$('login-submit-btn').disabled=false;return;}
      saveSession(existing[0].name,inputHash); refreshAuthUI();
    }
    closeModal('login-modal');
    tone(660,'sine',.12,.08); tone(880,'sine',.1,.06,0,.08);
  }catch(e){$('login-error').textContent='Fehler: '+(e&&e.message?e.message:'Unbekannt');$('login-submit-btn').disabled=false;}
}

// ── Score speichern ──
var nameCheckTimer=null;
var saveMode='';

function setSaveMode(mode){
  saveMode=mode==='existing'?'existing':'new';
  $('toggle-no').classList.toggle('active',saveMode==='new');
  $('toggle-yes').classList.toggle('active',saveMode==='existing');
  $('save-step-2').style.display='flex';
  $('save-error').textContent='';
  $('name-avail-hint').textContent=''; $('name-avail-hint').className='name-avail';
  $('save-name').value=''; $('save-pw').value='';
  if(saveMode==='new'){
    $('save-pw-hint').textContent='Erstellt deinen Account. Merke dir das Passwort!';
    $('save-name').readOnly=false;
  } else {
    $('save-pw-hint').textContent='Dein bisheriges Passwort.';
    $('save-name').readOnly=false;
    var session=loadSession(); if(session.name) $('save-name').value=session.name;
  }
  setTimeout(function(){$('save-name').focus();},80);
}

$('save-name')&&$('save-name').addEventListener('input',function(){
  var name=$('save-name').value.trim();
  $('save-error').textContent='';
  if(saveMode!=='new'){$('name-avail-hint').textContent='';$('name-avail-hint').className='name-avail';return;}
  if(!name){$('name-avail-hint').textContent='';$('name-avail-hint').className='name-avail';return;}
  if(!NAME_REGEX.test(name)){$('name-avail-hint').textContent='Nur Buchstaben, Zahlen, . - _ erlaubt.';$('name-avail-hint').className='name-avail taken';return;}
  clearTimeout(nameCheckTimer);
  $('name-avail-hint').textContent='Prüfe…'; $('name-avail-hint').className='name-avail checking';
  nameCheckTimer=setTimeout(async function(){
    try{
      var rows=await sbFetch('players?name=ilike.'+encodeURIComponent(name)+'&select=id');
      if(rows&&rows.length){$('name-avail-hint').textContent='Dieser Name ist bereits vergeben.';$('name-avail-hint').className='name-avail taken';}
      else{$('name-avail-hint').textContent='Name verfügbar!';$('name-avail-hint').className='name-avail ok';}
    }catch(e){$('name-avail-hint').textContent='';$('name-avail-hint').className='name-avail';}
  },350);
});

async function saveScore(){
  if(S.hasSavedThisRun) return;
  if(S.isLoggedIn){autoSaveLoggedInUser();return;}
  S.pendingSaveTarget=S.mode==='daily'?'daily':'global';
  $('save-error').textContent='';
  $('name-avail-hint').textContent=''; $('name-avail-hint').className='name-avail';
  $('save-name').value=''; $('save-pw').value='';
  $('save-submit-btn').disabled=false;
  $('save-step-2').style.display='none';
  $('toggle-no').classList.remove('active'); $('toggle-yes').classList.remove('active');
  saveMode='';
  $('save-modal-hint').textContent=S.pendingSaveTarget==='daily'?'Wird nur ins heutige Daily-Board eingetragen.':'Wird ins globale Leaderboard eingetragen.';
  openModal('save-modal');
}

async function autoSaveLoggedInUser(){
  if(S.hasSavedThisRun) return;
  var session=loadSession();
  if(!session.name||!session.pwHash){saveScore();return;}
  try{
    if(S.pendingSaveTarget==='daily'){
      var deviceId=getOrCreateDeviceId();
      var res=await sbFetch('rpc/submit_daily_score','POST',{p_name:session.name,p_score:S.score,p_date_key:S.dailyKey,p_device_id:deviceId});
      if(!res||!res.ok){if(res&&res.error==='ALREADY_PLAYED_TODAY'){markDailyPlayedLocally(S.dailyKey);markScoreSavedUI();}return;}
      markDailyPlayedLocally(S.dailyKey); markScoreSavedUI(); updateDailyPlayAvailability();
      return;
    }
    await sbFetch('scores','POST',{name:session.name,score:S.score});
    markScoreSavedUI();
  }catch(e){console.warn('Auto-save failed:',e);}
}

async function submitScore(){
  if(S.hasSavedThisRun) return;
  var name=$('save-name').value.trim(), pw=$('save-pw').value;
  if(!saveMode){$('save-error').textContent='Bitte wähle Ja oder Nein.';return;}
  if(!name){$('save-error').textContent='Bitte einen Namen eingeben.';return;}
  if(!pw){$('save-error').textContent='Bitte ein Passwort eingeben.';return;}
  if(!NAME_REGEX.test(name)){$('save-error').textContent='Name: nur Buchstaben, Zahlen, . - _ erlaubt.';return;}
  $('save-error').textContent=''; $('save-submit-btn').disabled=true;
  try{
    var inputHash=await hashString(pw);
    var existing=await sbFetch('players?name=ilike.'+encodeURIComponent(name)+'&select=id,name,pw_hash');
    if(saveMode==='new'){
      if(existing&&existing.length){$('save-error').textContent='Dieser Name ist bereits vergeben.';$('save-submit-btn').disabled=false;return;}
      await sbFetch('players','POST',{name:name,pw_hash:inputHash});
      saveSession(name,inputHash); refreshAuthUI();
    } else {
      if(!existing||!existing.length){
        await sbFetch('players','POST',{name:name,pw_hash:inputHash});
        saveSession(name,inputHash); refreshAuthUI();
      } else {
        if(existing[0].pw_hash!==inputHash){$('save-error').textContent='Falsches Passwort.';$('save-submit-btn').disabled=false;return;}
        saveSession(existing[0].name,inputHash); refreshAuthUI();
        name=existing[0].name;
      }
    }
    if(S.pendingSaveTarget==='daily'){
      var deviceId=getOrCreateDeviceId();
      var res=await sbFetch('rpc/submit_daily_score','POST',{p_name:name,p_score:S.score,p_date_key:S.dailyKey,p_device_id:deviceId});
      if(!res||!res.ok){
        $('save-error').textContent=(res&&res.error==='ALREADY_PLAYED_TODAY')?'Du hast die Daily heute auf diesem Gerät schon gespielt.':'Fehler beim Speichern.';
        $('save-submit-btn').disabled=false; return;
      }
      markDailyPlayedLocally(S.dailyKey);
      closeModal('save-modal'); markScoreSavedUI();
      await loadDailyBoard(); updateDailyPlayAvailability();
      show('daily-screen'); return;
    }
    await sbFetch('scores','POST',{name:name,score:S.score});
    closeModal('save-modal'); markScoreSavedUI(); openLeaderboard();
  }catch(e){
    $('save-error').textContent=(e&&e.error==='ALREADY_PLAYED_TODAY')?'Du hast die Daily heute auf diesem Gerät schon gespielt.':'Fehler beim Speichern.';
    $('save-submit-btn').disabled=false;
  }
}

async function hashString(s){
  var buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
}

// ── Daily Board ──
async function loadDailyBoard(){
  var boardEl=$('daily-lb-list');
  if(!boardEl) return;
  boardEl.innerHTML='<div style="font-size:.7rem;color:var(--mist);text-align:center;padding:1rem">Lade…</div>';
  try{
    var todayKey=getViennaDateKey();
    var dailyRows=await sbFetch('daily_scores?date_key=eq.'+todayKey+'&select=name,score,created_at&order=score.desc&limit=50');
    boardEl.innerHTML='';
    if(!dailyRows||!dailyRows.length){boardEl.innerHTML='<div style="font-size:.72rem;color:var(--mist);text-align:center;padding:1.2rem">Heute noch keine Einträge.</div>';return;}
    dailyRows.forEach(function(r,i){
      var div=document.createElement('div'); div.className='lb-row';
      var medals=['🥇','🥈','🥉'];
      var rank=i<3?'<span class="lb-rank gold">'+medals[i]+'</span>':'<span class="lb-rank">'+(i+1)+'</span>';
      var d=new Date(r.created_at);
      var date=d.toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit',year:'numeric'});
      var time=d.toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit'});
      div.innerHTML=rank+'<span class="lb-name">'+escHtml(r.name)+'</span><span class="lb-score">'+fmtN(r.score)+'</span><span class="lb-date" data-time="'+time+'">'+date+'</span>';
      boardEl.appendChild(div);
      setTimeout(function(el){return function(){el.classList.add('in');};}(div),i*45);
    });
  }catch(e){boardEl.innerHTML='<div style="font-size:.72rem;color:#e8826a;text-align:center;padding:1.2rem">Fehler beim Laden.</div>';}
}

// ── Home ──
function goHome(){
  if(S.vsPollInterval){clearInterval(S.vsPollInterval);S.vsPollInterval=null;}
  if(S.heartbeatInterval){clearInterval(S.heartbeatInterval);S.heartbeatInterval=null;}
  stopSpectatePoll(); clearNextVoteTimers();
  if(S.vsRoom&&S.isVs) cleanupRoom();
  S.isVs=false; S.vsRoom=null;
  $('play-again-btn').disabled=false;
  $('play-again-btn').style.display='';
  $('vs-left-msg').classList.remove('show');
  $('survival-fail-overlay').classList.remove('show');
  show('start-screen');
  renderStreakDisplay('streak-display-start');
}

async function cleanupRoom(){
  try{await sbFetch('rooms?id=eq.'+S.vsRoom,'DELETE');}catch(e){}
}

// ── QR Code ──
function drawQR(canvas,text){
  if(typeof QRious!=='undefined'){new QRious({element:canvas,value:text,size:160,foreground:'#1a3322',background:'#ffffff',level:'M'});return;}
  var s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
  s.onload=function(){new QRious({element:canvas,value:text,size:160,foreground:'#1a3322',background:'#ffffff',level:'M'});};
  document.head.appendChild(s);
}

// ── QR Scanner ──
function openQrScanner(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert('QR-Scanner auf diesem Gerät nicht verfügbar.');return;}
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:900;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem';
  overlay.innerHTML='<p style="font-family:DM Mono,monospace;font-size:.72rem;color:#8fa89a;letter-spacing:.1em">Kamera auf QR-Code richten</p><video id="qr-video" style="width:min(320px,90vw);border-radius:12px;border:2px solid rgba(201,168,76,.4)" autoplay playsinline muted></video><canvas id="qr-canvas-scan" style="display:none"></canvas><button style="font-family:DM Mono,monospace;font-size:.78rem;color:#f5b7b1;border:1.5px solid rgba(192,57,43,.6);background:rgba(192,57,43,.15);padding:.6rem 1.2rem;border-radius:10px;cursor:pointer" onclick="closeQrScanner()">Abbrechen</button>';
  document.body.appendChild(overlay);
  window._qrScanOverlay=overlay;
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(function(stream){
    var video=document.getElementById('qr-video');
    if(!video) return;
    video.srcObject=stream; window._qrStream=stream; video.play();
    if('BarcodeDetector' in window){
      var detector=new BarcodeDetector({formats:['qr_code']});
      var scanning=true;
      function scan(){
        if(!scanning||!video||video.readyState<2){if(scanning) requestAnimationFrame(scan);return;}
        detector.detect(video).then(function(codes){
          if(!scanning) return;
          if(codes.length>0){scanning=false;var url=codes[0].rawValue;var match=url.match(/[?&]join=([A-Z0-9]{6})/i);if(match){closeQrScanner();$('vs-join-code').value=match[1].toUpperCase();}else{alert('Kein gültiger Code.');scanning=true;requestAnimationFrame(scan);}}
          else requestAnimationFrame(scan);
        }).catch(function(){if(scanning) requestAnimationFrame(scan);});
      }
      requestAnimationFrame(scan);
    } else {
      var script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.onload=function(){
        var canvas=document.getElementById('qr-canvas-scan'),ctx=canvas.getContext('2d'),scanning=true;
        function scan(){
          if(!scanning||!video||video.readyState<2){if(scanning) requestAnimationFrame(scan);return;}
          canvas.width=video.videoWidth; canvas.height=video.videoHeight;
          ctx.drawImage(video,0,0);
          var imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
          var code=jsQR(imgData.data,imgData.width,imgData.height);
          if(code){scanning=false;var match=code.data.match(/[?&]join=([A-Z0-9]{6})/i);if(match){closeQrScanner();$('vs-join-code').value=match[1].toUpperCase();}else{scanning=true;requestAnimationFrame(scan);}}
          else requestAnimationFrame(scan);
        }
        requestAnimationFrame(scan);
      };
      document.head.appendChild(script);
    }
  }).catch(function(){closeQrScanner();alert('Kamerazugriff verweigert.');});
}
function closeQrScanner(){
  if(window._qrStream){window._qrStream.getTracks().forEach(function(t){t.stop();});window._qrStream=null;}
  if(window._qrScanOverlay){window._qrScanOverlay.remove();window._qrScanOverlay=null;}
}

// ── VS Mode ──
function openVsModal(){
  var session=loadSession();
  if(session.name){$('vs-host-name').value=session.name;$('vs-join-name').value=session.name;}
  openModal('vs-modal');
}

var roomCreationInProgress=false;

async function createRoom(){
  if(roomCreationInProgress) return;
  var name=$('vs-host-name').value.trim();
  if(!name){$('vs-host-name').focus();return;}
  roomCreationInProgress=true;
  var code=randomCode();
  var locs=shuffle(LOCATIONS.slice()).slice(0,5).map(function(l){return l.id;});
  try{
    await sbFetch('rooms','POST',{id:code,host_name:name,location_ids:locs,host_scores:[],guest_scores:[],host_done:false,guest_done:false,host_guess_latlng:null,guest_guess_latlng:null,host_pano_angle:0,guest_pano_angle:0,host_map_cursor:null,guest_map_cursor:null,next_votes:0,play_again_votes:0,host_online:true,guest_online:false,host_next_voted:false,guest_next_voted:false,host_play_again_voted:false,guest_play_again_voted:false,last_activity:new Date().toISOString()});
    S.vsRoom=code; S.vsIsHost=true; S.vsMyName=name; S.vsMyScores=[]; S.vsTheirScores=[];
    closeModal('vs-modal');
    $('vs-room-code').textContent=code;
    var joinURL=window.location.origin+window.location.pathname+'?join='+code;
    drawQR($('vs-qr-canvas'),joinURL);
    openModal('vs-wait-modal');
    pollForGuest();
  }catch(e){alert('Fehler beim Erstellen: '+(e&&e.message?e.message:JSON.stringify(e)));}
  finally{roomCreationInProgress=false;}
}

async function cancelRoom(){
  if(S.vsRoom) await sbFetch('rooms?id=eq.'+S.vsRoom,'DELETE').catch(function(){});
  S.vsRoom=null; closeModal('vs-wait-modal');
}

var guestPollActive=false;

function pollForGuest(){
  if(guestPollActive) return;
  guestPollActive=true;
  var tries=0;
  var iv=setInterval(async function(){
    tries++;
    if(tries>120){clearInterval(iv);guestPollActive=false;cancelRoom();return;}
    try{
      var rows=await sbFetch('rooms?id=eq.'+S.vsRoom+'&select=guest_name,guest_online,location_ids');
      if(rows&&rows[0]&&rows[0].guest_name&&rows[0].guest_online){
        clearInterval(iv); guestPollActive=false;
        S.vsTheirName=rows[0].guest_name;
        closeModal('vs-wait-modal'); startVsGame(rows[0].location_ids);
      }
    }catch(e){}
  },2500);
}

async function joinRoom(){
  var name=$('vs-join-name').value.trim(), code=$('vs-join-code').value.trim().toUpperCase();
  if(!name||!code){$('vs-join-error').textContent='Name und Code eingeben.';return;}
  $('vs-join-error').textContent='';
  try{
    var rows=await sbFetch('rooms?id=eq.'+code+'&select=id,host_name,location_ids,guest_name');
    if(!rows||!rows.length){$('vs-join-error').textContent='Raum nicht gefunden.';return;}
    if(rows[0].guest_name){$('vs-join-error').textContent='Raum ist bereits voll.';return;}
    await sbFetch('rooms?id=eq.'+code,'PATCH',{guest_name:name,guest_online:true,last_activity:new Date().toISOString()});
    S.vsRoom=code; S.vsIsHost=false; S.vsMyName=name; S.vsTheirName=rows[0].host_name;
    S.vsTheirScores=[]; S.vsMyScores=[];
    closeModal('vs-modal'); startVsGame(rows[0].location_ids);
  }catch(e){$('vs-join-error').textContent='Fehler beim Beitreten.';}
}

// ── Deep link ──
function checkDeepLink(){
  var params=new URLSearchParams(window.location.search);
  var joinCode=params.get('join');
  if(joinCode&&joinCode.length===6){
    S.qrPendingCode=joinCode.toUpperCase();
    window.history.replaceState({},'',window.location.pathname);
    var session=loadSession();
    setTimeout(function(){
      if(session.name&&session.pwHash) autoQrJoin(S.qrPendingCode,session.name);
      else{
        $('qr-join-room-code').textContent='Raum: '+S.qrPendingCode;
        $('qr-join-name-input').value=session.name||'';
        show('qr-join-screen');
        if(!session.name) setTimeout(function(){$('qr-join-name-input').focus();},400);
      }
    },300);
  }
}

async function autoQrJoin(code,name){
  try{
    var rows=await sbFetch('rooms?id=eq.'+code+'&select=id,host_name,location_ids,guest_name');
    if(!rows||!rows.length){$('qr-join-room-code').textContent='Raum: '+code;$('qr-join-name-input').value=name;$('qr-join-error').textContent='Raum nicht gefunden.';show('qr-join-screen');return;}
    if(rows[0].guest_name){$('qr-join-room-code').textContent='Raum: '+code;$('qr-join-name-input').value=name;$('qr-join-error').textContent='Raum ist bereits voll.';show('qr-join-screen');return;}
    await sbFetch('rooms?id=eq.'+code,'PATCH',{guest_name:name,guest_online:true,last_activity:new Date().toISOString()});
    S.vsRoom=code; S.vsIsHost=false; S.vsMyName=name; S.vsTheirName=rows[0].host_name;
    S.vsTheirScores=[]; S.vsMyScores=[];
    startVsGame(rows[0].location_ids);
  }catch(e){$('qr-join-room-code').textContent='Raum: '+code;$('qr-join-name-input').value=name;$('qr-join-error').textContent='Fehler beim Beitreten.';show('qr-join-screen');}
}

async function qrJoinSubmit(){
  var name=$('qr-join-name-input').value.trim(), code=S.qrPendingCode;
  if(!name){$('qr-join-error').textContent='Bitte deinen Namen eingeben.';return;}
  if(!code){goToStart();return;}
  $('qr-join-error').textContent='';
  try{
    var rows=await sbFetch('rooms?id=eq.'+code+'&select=id,host_name,location_ids,guest_name');
    if(!rows||!rows.length){$('qr-join-error').textContent='Raum nicht gefunden.';return;}
    if(rows[0].guest_name){$('qr-join-error').textContent='Raum ist bereits voll.';return;}
    await sbFetch('rooms?id=eq.'+code,'PATCH',{guest_name:name,guest_online:true,last_activity:new Date().toISOString()});
    S.vsRoom=code; S.vsIsHost=false; S.vsMyName=name; S.vsTheirName=rows[0].host_name;
    S.vsTheirScores=[]; S.vsMyScores=[];
    startVsGame(rows[0].location_ids);
  }catch(e){$('qr-join-error').textContent='Fehler beim Beitreten.';}
}

function startVsGame(locIds){
  resetScoreSavedUI(); S.mode='vs'; S.roundsTotal=5;
  resetBaseState(); S.isVs=true; S.vsTheirScores=[]; S.vsMyScores=[]; S.skippedLocations=new Set();
  S.locations=locIds.map(function(id){return LOCATIONS.find(function(l){return l.id===id;});}).filter(Boolean);
  $('vs-badge').style.display='block'; $('vs-badge').textContent='VS '+S.vsTheirName;
  $('vs-strip').style.display='block';
  $('vs-strip-you').textContent=S.vsMyName; $('vs-strip-them').textContent=S.vsTheirName;
  $('round-total').textContent='5';
  sfx.start(); show('game-screen'); initPanoDrag(); loadRound(); startVsPoll(); startHeartbeat();
}

async function pushVsScore(pts,guessLL){
  try{
    var rows=await sbFetch('rooms?id=eq.'+S.vsRoom+'&select=host_scores,guest_scores');
    if(!rows||!rows[0]) return;
    var myKey=S.vsIsHost?'host_scores':'guest_scores';
    var gKey=S.vsIsHost?'host_guess_latlng':'guest_guess_latlng';
    var cur=(rows[0][myKey]||[]).slice(); cur.push(pts);
    var isLast=S.round>=S.roundsTotal-1;
    var patch={};
    patch[myKey]=cur;
    patch[gKey]={lat:guessLL.lat,lng:guessLL.lng,round:S.round};
    patch[S.vsIsHost?'host_done':'guest_done']=isLast;
    patch[S.vsIsHost?'host_next_voted':'guest_next_voted']=false;
    patch[S.vsIsHost?'guest_next_voted':'host_next_voted']=false;
    patch.next_votes=0;
    patch.last_activity=new Date().toISOString();
    await sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',patch);
  }catch(e){}
}

function startVsPoll(){
  if(S.vsPollInterval) clearInterval(S.vsPollInterval);
  S.vsPollInterval=setInterval(async function(){
    if(!S.vsRoom) return;
    try{
      var rows=await sbFetch('rooms?id=eq.'+S.vsRoom+'&select=host_scores,guest_scores,host_online,guest_online,next_votes,play_again_votes,host_next_voted,guest_next_voted,host_play_again_voted,guest_play_again_voted');
      if(!rows||!rows[0]){handleDisconnect();return;}
      var r=rows[0];
      var theirOnlineKey=S.vsIsHost?'guest_online':'host_online';
      if(!r[theirOnlineKey]&&!S.vsLeftShown){
        if(!S._leftGraceTimer){
          S._leftGraceTimer=setTimeout(function(){
            S._leftGraceTimer=null;
            if(!S.vsLeftShown){S.vsLeftShown=true;showVsLeftMessage(S.vsTheirName);}
          },6000);
        }
      } else if(r[theirOnlineKey]){
        if(S._leftGraceTimer){clearTimeout(S._leftGraceTimer);S._leftGraceTimer=null;}
        hideDcNotice();
      }
      S.vsTheirScores=(S.vsIsHost?r.guest_scores:r.host_scores)||[];
      updateVsStrip();
      var nv=r.next_votes||0, pav=r.play_again_votes||0;
      if(nv!==S.nextVotes){S.nextVotes=nv;updateNextVoteUI();}
      if(pav!==S.playAgainVotes){S.playAgainVotes=pav;updatePlayAgainVoteUI();}
      var myNV=S.vsIsHost?r.host_next_voted:r.guest_next_voted;
      var theirNV=S.vsIsHost?r.guest_next_voted:r.host_next_voted;
      // Check if skip pano votes came from other player while we're in game screen
      if($('game-screen').classList.contains('active')&&!_skipPanoVoted&&theirNV){
        var btn=$('vs-skip-pano-btn');
        if(btn) btn.textContent='Anderes Panorama? (1/2)';
      }
      if(myNV&&theirNV&&$('result-screen').classList.contains('active')&&S.vsTheirDone) nextRound();
      var myPAV=S.vsIsHost?r.host_play_again_voted:r.guest_play_again_voted;
      var theirPAV=S.vsIsHost?r.guest_play_again_voted:r.host_play_again_voted;
      if(myPAV&&theirPAV&&$('final-screen').classList.contains('active')) doPlayAgain();
    }catch(e){}
  },2500);
}

function showVsLeftMessage(name){
  if(S.vsPollInterval){clearInterval(S.vsPollInterval);S.vsPollInterval=null;}
  stopSpectatePoll(); clearNextVoteTimers();
  $('vs-left-title').textContent=name+' hat das Spiel verlassen.';
  $('vs-left-sub').textContent='Das Spiel wurde beendet.';
  $('vs-left-msg').classList.add('show');
  if(S.heartbeatInterval){clearInterval(S.heartbeatInterval);S.heartbeatInterval=null;}
}

function startSpectatePoll(){
  stopSpectatePoll(); S.vsTheirDone=false;
  $('spec-cursor').style.display='none'; $('spec-cursor-label').style.display='none';
  S.vsSpecPollInterval=setInterval(async function(){
    if(!S.vsRoom) return;
    try{
      var theirScoreKey=S.vsIsHost?'guest_scores':'host_scores';
      var theirGuessKey=S.vsIsHost?'guest_guess_latlng':'host_guess_latlng';
      var theirAngleKey=S.vsIsHost?'guest_pano_angle':'host_pano_angle';
      var theirCursorKey=S.vsIsHost?'guest_map_cursor':'host_map_cursor';
      var rows=await sbFetch('rooms?id=eq.'+S.vsRoom+'&select='+theirScoreKey+','+theirGuessKey+','+theirAngleKey+','+theirCursorKey);
      if(!rows||!rows[0]) return;
      var r=rows[0];
      var theirScores=r[theirScoreKey]||[];
      if(theirScores.length>S.round&&!S.vsTheirDone){
        S.vsTheirDone=true; S.vsTheirScores=theirScores;
        var tg=r[theirGuessKey];
        if(tg&&typeof tg.round!=='undefined'&&tg.round===S.round) S.vsTheirGuessLatLng=tg;
        else if(tg&&typeof tg.round==='undefined') S.vsTheirGuessLatLng=tg;
        onOpponentDone(); return;
      }
      if(!S.vsTheirDone){var cur=r[theirCursorKey],ang=r[theirAngleKey]||0;if(cur) updateSpecCursor(cur,ang);}
    }catch(e){}
  },1200);
}

function stopSpectatePoll(){
  if(S.vsSpecPollInterval){clearInterval(S.vsSpecPollInterval);S.vsSpecPollInterval=null;}
  $('spec-cursor').style.display='none'; $('spec-cursor-label').style.display='none';
}

function onOpponentDone(){
  stopSpectatePoll(); hideVsWaitOverlay(); clearSubmitCountdown(); $('vs-bottom-wait').classList.remove('show');
  if(S.vsTheirGuessLatLng&&S.resultMap){
    L.circleMarker([S.vsTheirGuessLatLng.lat,S.vsTheirGuessLatLng.lng],{radius:8,color:'#8fa89a',fillColor:'#8fa89a',fillOpacity:.8,weight:2}).addTo(S.resultMap).bindTooltip(S.vsTheirName,{permanent:true,direction:'top'});
    S.resultMap.fitBounds(L.latLngBounds([[S.current.lat,S.current.lng],[S.guessLatLng.lat,S.guessLatLng.lng],[S.vsTheirGuessLatLng.lat,S.vsTheirGuessLatLng.lng]]).pad(.5));
  }
  if(S.vsTheirGuessLatLng&&S.current){
    var theirDist=haversine(S.vsTheirGuessLatLng.lat,S.vsTheirGuessLatLng.lng,S.current.lat,S.current.lng);
    var theirPts=calcPts(theirDist);
    $('vs-their-guess-row').style.display='block';
    $('vs-their-guess-row').innerHTML='<span class="vs-their-dist">'+S.vsTheirName+': <strong>'+fmtD(theirDist)+'</strong></span>';
    $('vs-their-guess-row').dataset.pts=theirPts;
  }
  updateVsStrip(); showNextVoteUI(); $('next-btn').disabled=false;
}

function updateSpecCursor(cur,angle){
  var sc=$('spec-cursor'),sl=$('spec-cursor-label'),cont=$('pano-container');
  if(!cont) return;
  var rect=cont.getBoundingClientRect();
  sc.style.left=(cur.x*rect.width)+'px'; sc.style.top=(cur.y*rect.height)+'px';
  sl.style.left=(cur.x*rect.width)+'px'; sl.style.top=(cur.y*rect.height)+'px';
  sl.textContent=S.vsTheirName+' ('+hdg(angle)+')';
  sc.style.display='block'; sl.style.display='block';
}

var _submitCountdownInterval=null;
function startSubmitCountdown(){
  clearSubmitCountdown();
  var secs=20;
  var lbl=$('vs-submit-countdown');
  if(lbl){lbl.textContent='Gegner hat noch '+secs+'s…';lbl.classList.add('show');}
  _submitCountdownInterval=setInterval(function(){
    secs--;
    var l=$('vs-submit-countdown');
    if(l) l.textContent='Gegner hat noch '+secs+'s…';
    if(secs<=0) clearSubmitCountdown();
  },1000);
}
function clearSubmitCountdown(){
  if(_submitCountdownInterval){clearInterval(_submitCountdownInterval);_submitCountdownInterval=null;}
  var l=$('vs-submit-countdown');
  if(l){l.classList.remove('show');l.textContent='';}
}

function showVsWaitOverlay(doShow){
  var o=$('vs-wait-overlay'),rs=$('result-screen');
  if(doShow){
    rs.classList.add('vs-clean-wait'); o.classList.add('show');
    $('vs-wait-overlay-text').textContent='Warte auf '+S.vsTheirName+'…';
    $('vs-wait-overlay-sub').textContent='';
    $('next-btn').disabled=true;
    $('spec-cursor').style.left='50%'; $('spec-cursor').style.top='40%'; $('spec-cursor').style.display='block';
    $('spec-cursor-label').style.left='50%'; $('spec-cursor-label').style.top='40%';
    $('spec-cursor-label').textContent=S.vsTheirName; $('spec-cursor-label').style.display='block';
  } else {
    rs.classList.remove('vs-clean-wait'); o.classList.remove('show');
  }
}

function hideVsWaitOverlay(){$('result-screen').classList.remove('vs-clean-wait');$('vs-wait-overlay').classList.remove('show');}

function startHeartbeat(){
  if(S.heartbeatInterval) clearInterval(S.heartbeatInterval);
  S.heartbeatInterval=setInterval(async function(){
    if(!S.vsRoom) return;
    try{
      var angleKey=S.vsIsHost?'host_pano_angle':'guest_pano_angle';
      var onlineKey=S.vsIsHost?'host_online':'guest_online';
      var patch={}; patch[angleKey]=S.panoAngle; patch[onlineKey]=true; patch.last_activity=new Date().toISOString();
      await sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',patch);
    }catch(e){}
  },3000);
  // kein leakx^
  if(!_heartbeatListenerAdded){
    _heartbeatListenerAdded=true;
    $('pano-container').addEventListener('mousemove',function(e){
      if(!S.vsRoom||!S.isVs) return;
      var rect=$('pano-container').getBoundingClientRect();
      var cx=(e.clientX-rect.left)/rect.width, cy=(e.clientY-rect.top)/rect.height;
      var curKey=S.vsIsHost?'host_map_cursor':'guest_map_cursor';
      var p={}; p[curKey]={x:cx,y:cy};
      sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',p).catch(function(){});
    });
  }
}

function handleDisconnect(){showDcNotice('Verbindung verloren.');}
function showDcNotice(msg){$('dc-notice').textContent=msg;$('dc-notice').classList.add('show');}
function hideDcNotice(){$('dc-notice').classList.remove('show');}

function showNextVoteUI(){
  $('next-vote-bar').classList.add('show'); updateNextVoteUI();
  // Reveal opponent's round score now (suspense over)
  var row=$('vs-their-guess-row');
  if(row&&row.dataset.pts){
    var pts=parseInt(row.dataset.pts);
    var distSpan=row.querySelector('.vs-their-dist');
    if(distSpan) distSpan.insertAdjacentHTML('afterend','<span class="vs-their-pts-reveal"> · '+fmtN(pts)+' Pkt.</span>');
    delete row.dataset.pts;
  }
  var secs=NEXT_AUTO_SECS;
  S.nextVoteAutoTimer=setInterval(function(){
    secs--;
    var tb=$('next-vote-timer'); if(tb) tb.textContent='('+secs+'s)';
    if(secs<=0){clearNextVoteTimers();nextRound();}
  },1000);
}

function updateNextVoteUI(){
  var bar=$('next-vote-bar');
  if(!bar.classList.contains('show')) return;
  bar.innerHTML='Nächste Runde ('+S.nextVotes+'/2) <span id="next-vote-timer"></span>';
}

async function voteNext(){
  if(!S.isVs){nextRound();return;}
  if(S.myNextVoted) return;
  S.myNextVoted=true; $('next-btn').disabled=true;
  try{
    var rows=await sbFetch('rooms?id=eq.'+S.vsRoom+'&select=next_votes,host_next_voted,guest_next_voted');
    var cur=(rows&&rows[0]&&rows[0].next_votes)||0;
    var myVK=S.vsIsHost?'host_next_voted':'guest_next_voted';
    var theirVK=S.vsIsHost?'guest_next_voted':'host_next_voted';
    var patch={next_votes:cur+1}; patch[myVK]=true;
    await sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',patch);
    S.nextVotes=cur+1; updateNextVoteUI();
    var theirAlreadyVoted=rows&&rows[0]&&rows[0][theirVK];
    if(S.nextVotes>=2||theirAlreadyVoted){
      clearNextVoteTimers();
      if(S.vsTheirDone) nextRound();
      else{var waitCheck=setInterval(function(){if(S.vsTheirDone){clearInterval(waitCheck);nextRound();}},500);setTimeout(function(){clearInterval(waitCheck);nextRound();},15000);}
    }
  }catch(e){S.myNextVoted=false;$('next-btn').disabled=false;}
}

function clearNextVoteTimers(){
  if(S.nextVoteTimer){clearInterval(S.nextVoteTimer);S.nextVoteTimer=null;}
  if(S.nextVoteAutoTimer){clearInterval(S.nextVoteAutoTimer);S.nextVoteAutoTimer=null;}
}

async function votePlayAgain(){
  if(!S.isVs){
    if(S.mode==='daily'){startDailyChallenge();return;}
    if(S.mode==='survival'){startSurvival();return;}
    doPlayAgain(); return;
  }
  if(S.myPlayAgainVoted) return;
  S.myPlayAgainVoted=true;
  $('play-again-btn').disabled=true;
  $('play-again-btn').textContent='Gewartet…';
  try{
    var rows=await sbFetch('rooms?id=eq.'+S.vsRoom+'&select=play_again_votes');
    var cur=(rows&&rows[0]&&rows[0].play_again_votes)||0;
    var myVK=S.vsIsHost?'host_play_again_voted':'guest_play_again_voted';
    var patch={play_again_votes:cur+1}; patch[myVK]=true;
    await sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',patch);
    S.playAgainVotes=cur+1; updatePlayAgainVoteUI();
    if(S.playAgainVotes>=2) doPlayAgain();
  }catch(e){S.myPlayAgainVoted=false;$('play-again-btn').disabled=false;$('play-again-btn').textContent='Nochmal';}
}

function updatePlayAgainVoteUI(){
  var bar=$('play-again-vote');
  bar.style.display='block'; bar.textContent='Nochmal ('+S.playAgainVotes+'/2)';
}

function doPlayAgain(){
  var locs=shuffle(LOCATIONS.slice()).slice(0,5).map(function(l){return l.id;});
  if(S.vsIsHost){
    sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',{location_ids:locs,host_scores:[],guest_scores:[],host_done:false,guest_done:false,next_votes:0,play_again_votes:0,host_next_voted:false,guest_next_voted:false,host_play_again_voted:false,guest_play_again_voted:false,last_activity:new Date().toISOString()}).catch(function(){});
    startVsGame(locs);
  } else {
    var iv=setInterval(async function(){
      try{
        var rows=await sbFetch('rooms?id=eq.'+S.vsRoom+'&select=location_ids,host_scores');
        if(rows&&rows[0]&&(!rows[0].host_scores||rows[0].host_scores.length===0)){clearInterval(iv);startVsGame(rows[0].location_ids);}
      }catch(e){}
    },2000);
  }
}

function updateVsStrip(){
  var myReal=S.score, their=(S.vsTheirScores||[]).reduce(function(a,b){return a+b;},0), max=Math.max(myReal,their,1);
  $('vs-bar-you').style.width=(myReal/max*100)+'%';
  $('vs-bar-them').style.width=(their/max*100)+'%';
  $('vs-strip-you-score').textContent=fmtN(myReal);
  // nur zeigen wenn der gegner fertig ist
  if(S.vsTheirDone){
    $('vs-strip-them-score').textContent=S.vsTheirScores.length?fmtN(their):'—';
  } else {
    $('vs-strip-them-score').textContent='?';
  }
}

function showVsFinalResult(){
  var my=S.score, their=(S.vsTheirScores||[]).reduce(function(a,b){return a+b;},0);
  $('vs-result-box').classList.add('show');
  $('vs-final-you').textContent=S.vsMyName+': '+fmtN(my);
  $('vs-final-them').textContent=S.vsTheirName+': '+fmtN(their);
  if(my>their) $('vs-winner-text').textContent='Du gewinnst! 🏆';
  else if(their>my) $('vs-winner-text').textContent=S.vsTheirName+' gewinnt.';
  else $('vs-winner-text').textContent='Unentschieden.';
  if(S.vsPollInterval){clearInterval(S.vsPollInterval);S.vsPollInterval=null;}
  $('play-again-vote').style.display='none';
  if(S.vsIsHost) setTimeout(cleanupRoom,5000);
}

// ── VS: Vote to skip panorama ──
var _skipPanoVoted=false;
function showSkipPanoBtn(){
  var btn=$('vs-skip-pano-btn');
  if(!btn||!S.isVs) return;
  btn.style.display='block';
  btn.disabled=false;
  btn.textContent='Anderes Panorama? (0/2)';
  _skipPanoVoted=false;
}
function hideSkipPanoBtn(){
  var btn=$('vs-skip-pano-btn'); if(btn) btn.style.display='none';
  _skipPanoVoted=false;
}
async function voteSkipPano(){
  if(!S.isVs||_skipPanoVoted) return;
  _skipPanoVoted=true;
  var btn=$('vs-skip-pano-btn'); if(btn){btn.disabled=true;btn.textContent='Abgestimmt… (1/2)';}
  try{
    var myVK=S.vsIsHost?'host_next_voted':'guest_next_voted';
    var theirVK=S.vsIsHost?'guest_next_voted':'host_next_voted';
    var rows=await sbFetch('rooms?id=eq.'+S.vsRoom+'&select=next_votes,host_next_voted,guest_next_voted');
    var cur=(rows&&rows[0]&&rows[0].next_votes)||0;
    var theirVoted=rows&&rows[0]&&rows[0][theirVK];
    var patch={next_votes:cur+1}; patch[myVK]=true;
    await sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',patch);
    if(cur+1>=2||theirVoted){
      // Both voted — skip pano
      hideSkipPanoBtn();
      // Reset votes
      await sbFetch('rooms?id=eq.'+S.vsRoom,'PATCH',{next_votes:0,host_next_voted:false,guest_next_voted:false});
      skipToNextLocation();
    } else {
      if(btn) btn.textContent='Abgestimmt… (1/2)';
    }
  }catch(e){_skipPanoVoted=false;var b=$('vs-skip-pano-btn');if(b){b.disabled=false;b.textContent='Anderes Panorama? (1/2)';}}
}

async function cleanupStaleRooms(){
  try{var cutoff=new Date(Date.now()-2*60*60*1000).toISOString();await sbFetch('rooms?last_activity=lt.'+cutoff,'DELETE');}catch(e){}
}

// ── Keyboard shortcuts ──
document.addEventListener('keydown',function(e){
  if(e.code==='Space'||e.key===' '){
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
    e.preventDefault();
    if($('game-screen').classList.contains('active')){var btn=$('guess-btn');if(btn&&!btn.disabled){resumeAC();submitGuess();}}
    else if($('result-screen').classList.contains('active')){var nextBtn=$('next-btn');if(nextBtn&&!nextBtn.disabled){resumeAC();voteNext();}}
  }
  if(e.key==='Escape'){
    ['lb-modal','save-modal','admin-modal','vs-modal','vs-wait-modal','login-modal'].forEach(function(id){if($(id)&&$(id).classList.contains('open')) closeModal(id);});
    closeLogoutConfirm();
  }
  if((e.key==='m'||e.key==='M')&&$('game-screen').classList.contains('active')&&e.target.tagName!=='INPUT') cycleVolume();
  if((e.key==='e'||e.key==='E')&&$('game-screen').classList.contains('active')&&e.target.tagName!=='INPUT') toggleExpand();
});

// ── Leave warning ──
function shouldWarnOnLeave(){
  if($('start-screen').classList.contains('active')) return false;
  if($('play-menu-screen').classList.contains('active')) return false;
  if($('daily-screen').classList.contains('active')) return false;
  if($('final-screen').classList.contains('active')) return false;
  if($('game-screen').classList.contains('active')) return true;
  if($('result-screen').classList.contains('active')&&S.round<S.roundsTotal) return true;
  return false;
}

window.addEventListener('beforeunload',function(e){
  if(S.vsRoom&&S.isVs){
    var key=S.vsIsHost?'host_online':'guest_online';
    var patch={}; patch[key]=false;
    navigator.sendBeacon(SB_URL+'/rest/v1/rooms?id=eq.'+S.vsRoom,JSON.stringify(patch));
  }
  if(!shouldWarnOnLeave()) return;
  e.preventDefault(); e.returnValue=''; return '';
});

// ── Events ──
$('save-name')&&$('save-name').addEventListener('keydown',function(e){if(e.key==='Enter') submitScore();});
$('admin-pw')&&$('admin-pw').addEventListener('keydown',function(e){if(e.key==='Enter') checkAdminPw();});
$('qr-join-name-input')&&$('qr-join-name-input').addEventListener('keydown',function(e){if(e.key==='Enter') qrJoinSubmit();});
$('login-name')&&$('login-name').addEventListener('keydown',function(e){if(e.key==='Enter') $('login-pw').focus();});
$('login-pw')&&$('login-pw').addEventListener('keydown',function(e){if(e.key==='Enter') submitLogin();});
$('vs-join-code')&&$('vs-join-code').addEventListener('input',function(e){e.target.value=e.target.value.toUpperCase();});
document.addEventListener('contextmenu',function(e){e.preventDefault();});
document.addEventListener('dragstart',function(e){e.preventDefault();});

// ── Init ──
window.addEventListener('load',function(){
  show('start-screen');
  setTimeout(function(){$('logo-h1').classList.add('in');},100);
  setTimeout(function(){$('logo-p').classList.add('in');},200);
  setTimeout(function(){$('start-main').classList.add('in');},300);
  setTimeout(function(){renderStreakDisplay('streak-display-start');},400);
  setDailyInfo();
  getOrCreateDeviceId();
  refreshAuthUI();
  checkDeepLink();
  cleanupStaleRooms();
  loadDailyBoard();
  updateDailyPlayAvailability();
  startDailyTimers();
});
