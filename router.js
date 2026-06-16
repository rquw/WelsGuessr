/* ──────────────────────────────────────────────────────────────
   router.js — Client-Routing (ohne Neuladen) + 404-Minispiel
   /            → Startmenü
   /spielen     → Spielen-Menü
   /gegeneinander → Mehrspieler
   /info        → Info
   /spieler/N   → Profil mit Kontonummer N (über Höchstwert → letzter; sonst 404-Spiel)
   alles andere → 404-Minispiel
   Lädt zuletzt. REPO ist die einzige Pro-Repo-Abweichung.
   Deep-Links/Refresh auf GitHub Pages: siehe 404.html + Snippet im <head>.
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var REPO = 'WelsGuessr';                                  // pro Repo: TernberGuessr/SchartenGuessr
  var BASE = (location.hostname.indexOf('github.io') >= 0) ? ('/' + REPO) : '';
  var $ = function (i) { return document.getElementById(i); };
  var routing = false;

  function curPath(){ var p=location.pathname; if(BASE&&p.indexOf(BASE)===0)p=p.slice(BASE.length); if(!p)p='/'; return p; }
  function setUrl(p, replace){ var full=BASE+p; if(location.pathname===full)return; try{ history[replace?'replaceState':'pushState']({},'',full); }catch(e){} }
  // von profile.js aufgerufen, sobald die Kontonummer bekannt ist
  window.routeProfileNum=function(n){ if(!n)return; var t='/spieler/'+n; if(curPath()!==t) setUrl(t,false); };

  function homeScreen(){ if(typeof window.goToStart==='function')goToStart(); else if(typeof window.show==='function')show('start-screen'); }

  function route(){
    routing=true;
    try{
      var p=curPath();
      if(p==='/'||/index\.html$/.test(p)){ hide404(); homeScreen(); }
      else if(p==='/spielen'){ hide404(); if(window.openPlayMenu)openPlayMenu(); }
      else if(p==='/gegeneinander'){ hide404(); if(window.openVsModal)openVsModal(); }
      else if(p==='/info'){ hide404(); if(window.openInfoScreen)openInfoScreen(); }
      else { var m=p.match(/^\/spieler\/(.+)$/); if(m){ hide404(); openSpieler(decodeURIComponent(m[1])); } else { show404(); } }
    }finally{ routing=false; }
  }

  async function openSpieler(raw){
    var n=parseInt(raw,10);
    if(!isFinite(n)||n<1){ show404(); return; }
    var ok=(typeof window.openProfileByNumber==='function') ? await openProfileByNumber(n) : false;
    if(ok) return;
    try{
      var rows=await sbFetch('players?select=account_number&order=account_number.desc&limit=1');
      var max=(rows&&rows[0]&&rows[0].account_number)||0;
      if(max&&n>max){ setUrl('/spieler/'+max,true); openProfileByNumber(max); return; }   // über Höchstwert → letzter Spieler
    }catch(e){}
    show404();
  }

  // nav-Funktionen umhüllen → Adresszeile aktualisieren (kein Reload)
  function wrap(name,url){ var o=window[name]; if(typeof o!=='function')return; window[name]=function(){ var r=o.apply(this,arguments); if(!routing) setUrl(url); return r; }; }
  function wrapAll(){ wrap('openPlayMenu','/spielen'); wrap('openVsModal','/gegeneinander'); wrap('openInfoScreen','/info'); wrap('goToStart','/'); wrap('goHome','/'); }

  // ════════════════════════ 404-Minispiel ════════════════════════
  var G={iv:null,score:0,time:0,running:false};
  function injectGameCSS(){
    if($('g404-style'))return;
    var s=document.createElement('style'); s.id='g404-style';
    s.textContent=[
      '#screen-404{display:none;position:fixed;inset:0;z-index:5000;background:radial-gradient(circle at 50% 35%,#11251a,#050805 75%);flex-direction:column;align-items:center;justify-content:center;padding:1.2rem;text-align:center;color:var(--cream,#f5efe0)}',
      '.g404-box{display:flex;flex-direction:column;align-items:center;gap:.7rem;width:min(94vw,460px)}',
      '.g404-title{font-family:"Playfair Display",serif;font-size:clamp(3rem,16vw,6rem);font-weight:900;color:var(--gold,#c9a84c);line-height:1}',
      '.g404-sub{font-size:.85rem;color:var(--mist,#8fa89a)}',
      '.g404-score{font-family:"DM Mono",monospace;font-size:.8rem;letter-spacing:.04em}',
      '#g404-arena{position:relative;width:100%;height:min(46vh,320px);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;overflow:hidden;margin:.3rem 0}',
      '#g404-target{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:2.4rem;background:none;border:none;cursor:pointer;padding:.2rem;transition:top .12s,left .12s;display:none}',
      '#g404-target:active{transform:translate(-50%,-50%) scale(.8)}',
      '.g404-row{display:flex;gap:.6rem}',
      '.g404-btn{background:rgba(201,168,76,.16);border:1px solid rgba(201,168,76,.5);color:var(--gold,#c9a84c);border-radius:12px;padding:.6rem 1.2rem;font-family:"DM Mono",monospace;font-size:.8rem;cursor:pointer}',
      '.g404-btn:hover{background:rgba(201,168,76,.3)}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function show404(){
    injectGameCSS();
    var s=$('screen-404');
    if(!s){
      s=document.createElement('div'); s.id='screen-404';
      s.innerHTML='<div class="g404-box">'+
        '<div class="g404-title">404</div>'+
        '<div class="g404-sub">Seite nicht gefunden, aber hey, ein Minispiel! Klick die 🌍 so oft du kannst.</div>'+
        '<div class="g404-score">Klicks: <span id="g404-score">0</span> · Zeit: <span id="g404-time">15</span>s</div>'+
        '<div id="g404-arena"><button id="g404-target" type="button">🌍</button></div>'+
        '<div class="g404-row"><button class="g404-btn" id="g404-start">Start</button><button class="g404-btn" id="g404-home">Zur Startseite</button></div>'+
      '</div>';
      document.body.appendChild(s);
      $('g404-start').onclick=startGame;
      $('g404-target').onclick=hitTarget;
      $('g404-home').onclick=function(){ hide404(); setUrl('/'); homeScreen(); };
    }
    s.style.display='flex';
    stopGame(); G.score=0; G.time=15;
    var sc=$('g404-score'),tm=$('g404-time'),tg=$('g404-target');
    if(sc)sc.textContent='0'; if(tm)tm.textContent='15'; if(tg)tg.style.display='none';
    var st=$('g404-start'); if(st)st.textContent='Start';
  }
  function hide404(){ var s=$('screen-404'); if(s)s.style.display='none'; stopGame(); }
  function stopGame(){ if(G.iv){clearInterval(G.iv);G.iv=null;} G.running=false; }
  function moveTarget(){
    var ar=$('g404-arena'),tg=$('g404-target'); if(!ar||!tg)return;
    var pad=30, w=ar.clientWidth-pad*2, h=ar.clientHeight-pad*2;
    tg.style.left=(pad+Math.random()*Math.max(0,w))+'px';
    tg.style.top=(pad+Math.random()*Math.max(0,h))+'px';
    tg.style.transform='scale(1)';
  }
  function startGame(){
    stopGame(); G.score=0; G.time=15; G.running=true;
    $('g404-score').textContent='0'; $('g404-time').textContent='15';
    var tg=$('g404-target'); tg.style.display='block'; moveTarget();
    $('g404-start').textContent='Neu';
    G.iv=setInterval(function(){ G.time--; $('g404-time').textContent=Math.max(0,G.time); if(G.time<=0){ endGame(); } },1000);
  }
  function hitTarget(){ if(!G.running)return; G.score++; $('g404-score').textContent=G.score; moveTarget(); }
  function endGame(){ stopGame(); var tg=$('g404-target'); if(tg)tg.style.display='none'; var sub=document.querySelector('#screen-404 .g404-sub'); if(sub)sub.textContent='Vorbei! Du hast '+G.score+' Treffer. Nochmal?'; }

  function boot(){ wrapAll(); window.addEventListener('popstate',route); route(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
})();
