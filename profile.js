/* ──────────────────────────────────────────────────────────────
   profile.js — Profilbilder (Kamera-only) + Editor + Cloudinary
   Eigenständiges Modul (injiziert eigenes Markup + CSS), lädt nach patches.js.
   Account-übergreifend: Avatare liegen auf EINEM Cloudinary (welsguessr-Cloud),
   die URL steht in der geteilten Supabase-Tabelle players.avatar_url.
   Portierbar (identische Datei) zwischen Ternberg/Wels/Scharten.
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var AVATAR_CLOUD  = 'dr7qhc0hn';        // gemeinsame Cloudinary-Cloud (wie Panoramen)
  var AVATAR_PRESET = 'guessr_avatars';   // UNSIGNED Upload-Preset (im Cloudinary-Dashboard anlegen!)
  var OUT = 512;                          // Ausgabegröße (quadratisch)
  var $id = function (i) { return document.getElementById(i); };
  function myName() { try { return (window.S && S.loggedInName) || ''; } catch (e) { return ''; } }
  function loggedIn() { try { return !!(window.S && S.isLoggedIn); } catch (e) { return false; } }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  // ── lokaler Avatar-Cache (sofortige Anzeige ohne Roundtrip) ──
  function cacheGet(name){ try { return localStorage.getItem('pg_avatar_'+name.toLowerCase())||''; } catch(e){ return ''; } }
  function cacheSet(name,url){ try { localStorage.setItem('pg_avatar_'+name.toLowerCase(),url||''); } catch(e){} }

  // ── Supabase ──
  async function fetchAvatar(name){
    if(!name) return '';
    try{
      var rows=await sbFetch('players?name=ilike.'+encodeURIComponent(name)+'&select=avatar_url');
      var url=(rows&&rows[0]&&rows[0].avatar_url)||'';
      cacheSet(name,url);
      return url;
    }catch(e){ return cacheGet(name); }
  }
  async function fetchMeta(name){
    if(!name) return {};
    try{ var rows=await sbFetch('players?name=ilike.'+encodeURIComponent(name)+'&select=avatar_url,profile_banner_url,account_number'); return (rows&&rows[0])||{}; }catch(e){ return {}; }
  }
  // Profil per Kontonummer öffnen (für /spieler/N)
  window.openProfileByNumber=async function(n){
    n=parseInt(n,10); if(!isFinite(n)) return false;
    try{ var rows=await sbFetch('players?account_number=eq.'+n+'&select=name'); if(rows&&rows[0]){ openProfile(rows[0].name); return true; } }catch(e){}
    return false;
  };
  async function saveAvatar(url){
    var name=myName(); if(!name) return false;
    try{
      await sbFetch('players?name=ilike.'+encodeURIComponent(name),'PATCH',{avatar_url:url||null});
      cacheSet(name,url||'');
      return true;
    }catch(e){ return false; }
  }

  // ── Cloudinary Upload (unsigned) ──
  async function uploadToCloudinary(blob){
    var fd=new FormData();
    fd.append('file',blob);
    fd.append('upload_preset',AVATAR_PRESET);   // KEIN folder-Param: unsigned-Presets lehnen das oft mit 400 ab; Ordner ggf. im Preset einstellen
    var res=await fetch('https://api.cloudinary.com/v1_1/'+AVATAR_CLOUD+'/image/upload',{method:'POST',body:fd});
    var data=await res.json().catch(function(){return {};});
    if(!res.ok){ throw new Error('Cloudinary '+res.status+': '+((data.error&&data.error.message)||'Upload fehlgeschlagen – Preset "'+AVATAR_PRESET+'" als UNSIGNED anlegen?')); }
    return data.secure_url;
  }

  // ── Avatar in ein Element rendern (Bild oder Fallback-Buchstabe) ──
  // Hintergrundbild erst setzen, wenn es fertig geladen ist (kein sichtbarer Platzhalter)
  function pgSetBg(el, url){
    if(!el) return;
    if(!url){ el.style.backgroundImage=''; el.classList.remove('pf-has-img'); return; }
    var img=new Image();
    img.onload=function(){ el.style.backgroundImage='url("'+url+'")'; el.classList.add('pf-has-img'); };
    img.src=url;
  }
  function applyAvatar(el, url, fallbackLetter){
    if(!el) return;
    el.classList.remove('pf-has-img'); el.style.backgroundImage='';
    el.textContent=(fallbackLetter||'?').toUpperCase();   // Buchstabe zeigen, bis das Bild da ist
    if(url){ var img=new Image(); img.onload=function(){ el.style.backgroundImage='url("'+url+'")'; el.classList.add('pf-has-img'); el.textContent=''; }; img.src=url; }
  }

  // ══════════════════════════════════════════════════════════════
  //  Markup + CSS injizieren
  // ══════════════════════════════════════════════════════════════
  function injectCSS(){
    if($id('pf-style')) return;
    var s=document.createElement('style'); s.id='pf-style';
    s.textContent=[
      '.profile-avatar.pf-has-img{background-size:cover;background-position:center;color:transparent}',
      '#pf-overlay{display:none;position:fixed;inset:0;z-index:4000;background:rgba(4,8,5,.92);backdrop-filter:blur(4px);flex-direction:column;align-items:center;justify-content:center;gap:1rem;padding:1rem}',
      '#pf-overlay.show{display:flex}',
      '.pf-title{font-family:"Playfair Display",serif;font-size:1.3rem;color:var(--cream,#f5efe0)}',
      '.pf-stage{position:relative;width:min(86vw,360px);aspect-ratio:1/1;border-radius:18px;overflow:hidden;background:#000;box-shadow:0 18px 50px rgba(0,0,0,.5)}',
      '#pf-video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}',
      '#pf-canvas{width:100%;height:100%;touch-action:none;display:block}',
      '.pf-row{display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;align-items:center;max-width:min(90vw,420px)}',
      '.pf-btn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);color:var(--cream,#f5efe0);border-radius:12px;padding:.6rem 1rem;font-family:"DM Mono",monospace;font-size:.8rem;cursor:pointer;transition:background .15s,transform .1s}',
      '.pf-btn:hover{background:rgba(255,255,255,.16)}',
      '.pf-btn.primary{background:linear-gradient(180deg,#f3d889,#d6ad48);color:#231a04;border-color:transparent;font-weight:600}',
      '.pf-btn:disabled{opacity:.5;cursor:default}',
      '.pf-tool{width:2.4rem;height:2.4rem;display:flex;align-items:center;justify-content:center;font-size:1.1rem;padding:0;border-radius:10px}',
      '.pf-tool.active{outline:2px solid var(--gold,#c9a84c);background:rgba(201,168,76,.18)}',
      '.pf-swatch{width:1.7rem;height:1.7rem;border-radius:50%;border:2px solid rgba(255,255,255,.4);cursor:pointer}',
      '.pf-swatch.active{border-color:#fff;transform:scale(1.15)}',
      '.pf-emoji{font-size:1.3rem;cursor:pointer;padding:.2rem;border-radius:8px}',
      '.pf-emoji:hover{background:rgba(255,255,255,.12)}',
      '.pf-hint{font-size:.66rem;color:var(--mist,#8fa89a);text-align:center;max-width:30ch}',
      '.pf-cam-btn{margin-top:.6rem;background:rgba(201,168,76,.16);border:1px solid rgba(201,168,76,.5);color:var(--gold,#c9a84c);border-radius:20px;padding:.5rem 1.1rem;font-size:.74rem;cursor:pointer}',
      '.pf-cam-btn:hover{background:rgba(201,168,76,.28)}',
      '#pf-toast{position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);z-index:4100;background:rgba(201,168,76,.95);color:#1a1206;font-weight:700;padding:.7rem 1.4rem;border-radius:14px;display:none;font-size:1rem;box-shadow:0 8px 30px rgba(0,0,0,.4)}',
      '#pf-toast.show{display:block;animation:pfPop .25s ease}',
      '@keyframes pfPop{from{transform:translate(-50%,-50%) scale(.7);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}',
      '#pf-firstprompt{position:fixed;left:50%;bottom:1rem;transform:translateX(-50%);z-index:3500;display:flex;align-items:center;gap:.6rem;background:rgba(14,24,16,.96);border:1px solid rgba(201,168,76,.4);border-radius:14px;padding:.6rem .9rem;box-shadow:0 10px 34px rgba(0,0,0,.45);color:var(--cream,#f5efe0)}',
      '.profile-avatar{cursor:pointer}',
      '#pf-sheet{display:none;position:fixed;inset:0;z-index:4250;background:rgba(0,0,0,.6);align-items:center;justify-content:center;padding:1rem}',
      '#pf-sheet.show{display:flex}',
      '.pf-sheet-box{display:flex;flex-direction:column;gap:.55rem;background:#0e1810;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:1.2rem;width:min(92vw,320px)}',
      '.pf-sheet-title{font-family:"Playfair Display",serif;font-size:1.2rem;color:var(--cream,#f5efe0);text-align:center;margin-bottom:.2rem}',
      '.pf-acctnum{font-size:.66rem;color:var(--mist,#8fa89a);letter-spacing:.05em;margin-top:.15rem}',
      '#profile-screen .profile-header.pf-has-banner{background-size:cover;background-position:center;position:relative;border-radius:16px;padding:1rem;overflow:hidden}',
      '#profile-screen .profile-header.pf-has-banner::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,14,9,.3),rgba(8,14,9,.78));z-index:0}',
      '#profile-screen .profile-header.pf-has-banner>*{position:relative;z-index:1}',
      // Vollbild-Lightbox (Profilbild anschauen)
      '#pf-lightbox{display:none;position:fixed;inset:0;z-index:4200;background:rgba(0,0,0,.92);flex-direction:column;align-items:center;justify-content:center;gap:1.1rem;padding:1.2rem}',
      '#pf-lightbox.show{display:flex}',
      '#pf-lightbox img{max-width:90vw;max-height:72vh;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.6)}',
      // Vollbild-Erstprompt (Pflicht-Interaktion)
      '#pf-firstscreen{display:none;position:fixed;inset:0;z-index:4300;background:radial-gradient(circle at 50% 40%,#102016,#050805 75%);flex-direction:column;align-items:center;justify-content:center;gap:1.3rem;padding:1.5rem;text-align:center}',
      '#pf-firstscreen.show{display:flex}',
      '#pf-firstscreen .pf-fs-emoji{font-size:3.4rem}',
      '#pf-firstscreen h2{font-family:"Playfair Display",serif;font-size:clamp(1.4rem,5vw,2rem);color:var(--cream,#f5efe0);margin:0}',
      '#pf-firstscreen p{color:var(--mist,#8fa89a);font-size:.82rem;max-width:30ch;line-height:1.5;margin:0}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function injectMarkup(){
    if($id('pf-overlay')) return;
    var o=document.createElement('div'); o.id='pf-overlay';
    o.innerHTML=
      '<div class="pf-title" id="pf-title">Profilbild aufnehmen</div>'+
      '<div class="pf-stage">'+
        '<video id="pf-video" autoplay playsinline muted></video>'+
        '<canvas id="pf-canvas" width="'+OUT+'" height="'+OUT+'" style="display:none"></canvas>'+
      '</div>'+
      '<div class="pf-hint" id="pf-hint">Cheese!</div>'+
      // Kamera-Steuerung
      '<div class="pf-row" id="pf-cam-controls">'+
        '<button class="pf-btn primary" onclick="pfCapture()">📸 Foto aufnehmen</button>'+
        '<button class="pf-btn" id="pf-cam-remove" onclick="pfClearAvatar();pfCloseOverlay();" style="display:none">🗑 Bild entfernen</button>'+
        '<button class="pf-btn" onclick="pfCloseOverlay()">Abbrechen</button>'+
      '</div>'+
      // Editor-Steuerung
      '<div id="pf-edit-controls" style="display:none;flex-direction:column;gap:.5rem;align-items:center">'+
        '<div class="pf-row">'+
          '<button class="pf-btn pf-tool active" id="pf-tool-draw" onclick="pfSetTool(\'draw\')" title="Zeichnen">✏️</button>'+
          '<span class="pf-swatch active" style="background:#e23b3b" onclick="pfSetColor(\'#e23b3b\',this)"></span>'+
          '<span class="pf-swatch" style="background:#f3d24b" onclick="pfSetColor(\'#f3d24b\',this)"></span>'+
          '<span class="pf-swatch" style="background:#4bbf6b" onclick="pfSetColor(\'#4bbf6b\',this)"></span>'+
          '<span class="pf-swatch" style="background:#4aa3f0" onclick="pfSetColor(\'#4aa3f0\',this)"></span>'+
          '<span class="pf-swatch" style="background:#ffffff" onclick="pfSetColor(\'#ffffff\',this)"></span>'+
          '<span class="pf-swatch" style="background:#111111" onclick="pfSetColor(\'#111111\',this)"></span>'+
          '<button class="pf-btn pf-tool" onclick="pfUndo()" title="Rückgängig">↶</button>'+
        '</div>'+
        '<div class="pf-row" id="pf-filters">'+
          '<button class="pf-btn pf-tool active" onclick="pfSetFilter(\'none\',this)" title="Original">🚫</button>'+
          '<button class="pf-btn pf-tool" onclick="pfSetFilter(\'grayscale(1)\',this)" title="S/W">⚫</button>'+
          '<button class="pf-btn pf-tool" onclick="pfSetFilter(\'sepia(.7)\',this)" title="Sepia">🟤</button>'+
          '<button class="pf-btn pf-tool" onclick="pfSetFilter(\'saturate(1.8) contrast(1.1)\',this)" title="Knallig">🌈</button>'+
          '<button class="pf-btn pf-tool" onclick="pfSetFilter(\'brightness(1.25)\',this)" title="Hell">☀️</button>'+
          '<button class="pf-btn pf-tool" onclick="pfSetFilter(\'contrast(1.5) brightness(.9)\',this)" title="Dramatisch">🌑</button>'+
        '</div>'+
        '<div class="pf-row"><span style="font-size:.72rem;color:var(--mist,#8fa89a)">☀️ Helligkeit</span><input type="range" id="pf-bri" min="0.4" max="1.8" step="0.05" value="1" oninput="pfSetBrightness(this.value)" style="width:150px;accent-color:var(--gold,#c9a84c)"></div>'+
        '<div class="pf-row" id="pf-emojis"></div>'+
        '<div class="pf-row">'+
          '<button class="pf-btn primary" id="pf-save-btn" onclick="pfSaveEdited()">Speichern</button>'+
          '<button class="pf-btn" onclick="pfRetake()">Neu aufnehmen</button>'+
          '<button class="pf-btn" onclick="pfCloseOverlay()">Abbrechen</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(o);
    var t=document.createElement('div'); t.id='pf-toast'; document.body.appendChild(t);
    // Emoji-Palette
    var emojis=['😎','👑','🔥','⭐','❤️','😂','👍','🎉','😈','🦄','🍕','🐱'];
    $id('pf-emojis').innerHTML=emojis.map(function(e){return '<span class="pf-emoji" onclick="pfAddSticker(\''+e+'\')">'+e+'</span>';}).join('');
  }

  // ══════════════════════════════════════════════════════════════
  //  Kamera
  // ══════════════════════════════════════════════════════════════
  var stream=null, photo=null; // photo = HTMLImageElement der Aufnahme
  function showToast(msg,ms){ var t=$id('pf-toast'); if(!t)return; t.textContent=msg; t.classList.add('show'); setTimeout(function(){t.classList.remove('show');},ms||1100); }

  window.pfOpenCamera=async function(){
    injectCSS(); injectMarkup(); bannerMode=false;
    $id('pf-title').textContent='Profilbild aufnehmen';
    $id('pf-video').style.display=''; $id('pf-canvas').style.display='none';
    $id('pf-cam-controls').style.display='flex'; $id('pf-edit-controls').style.display='none';
    var rm=$id('pf-cam-remove'); if(rm)rm.style.display=cacheGet(myName())?'':'none';   // Entfernen nur wenn ein Bild existiert
    $id('pf-hint').textContent='Cheese!';
    $id('pf-overlay').classList.add('show');
    try{
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:720},height:{ideal:720}},audio:false});
      var v=$id('pf-video'); v.srcObject=stream;
    }catch(e){
      $id('pf-hint').textContent='Kamera nicht verfügbar oder Zugriff verweigert. (Profilbild geht nur per Kamera.)';
      $id('pf-cam-controls').innerHTML='<button class="pf-btn" onclick="pfCloseOverlay()">Schließen</button>';
    }
  };
  function stopStream(){ if(stream){ stream.getTracks().forEach(function(t){t.stop();}); stream=null; } }
  window.pfCloseOverlay=function(){ stopStream(); var o=$id('pf-overlay'); if(o)o.classList.remove('show'); };

  window.pfCapture=function(){
    var v=$id('pf-video'); if(!v||!v.videoWidth) return;
    // zentrierter quadratischer Ausschnitt, gespiegelt (wie Vorschau)
    var side=Math.min(v.videoWidth,v.videoHeight);
    var sx=(v.videoWidth-side)/2, sy=(v.videoHeight-side)/2;
    var tmp=document.createElement('canvas'); tmp.width=OUT; tmp.height=OUT;
    var c=tmp.getContext('2d');
    c.save(); c.translate(OUT,0); c.scale(-1,1);
    c.drawImage(v,sx,sy,side,side,0,0,OUT,OUT); c.restore();
    photo=new Image(); photo.onload=function(){ enterEditor(); }; photo.src=tmp.toDataURL('image/jpeg',0.92);
    stopStream();
  };

  // ══════════════════════════════════════════════════════════════
  //  Editor
  // ══════════════════════════════════════════════════════════════
  var tool='draw', color='#e23b3b', filter='none', bri=1;
  var bannerMode=false, bgColor='#16331f';   // Banner: leinwand statt Foto
  var strokes=[], stickers=[], curStroke=null, selSticker=null, dragOff=null;
  function enterEditor(){
    strokes=[]; stickers=[]; curStroke=null; selSticker=null; filter='none'; tool='draw'; bri=1;
    var _br=$id('pf-bri'); if(_br)_br.value=1;
    $id('pf-title').textContent='Bearbeiten';
    $id('pf-video').style.display='none';
    var cv=$id('pf-canvas'); cv.style.display='block';
    $id('pf-cam-controls').style.display='none'; $id('pf-edit-controls').style.display='flex';
    var sb=$id('pf-save-btn'); if(sb){ sb.disabled=false; sb.textContent='Speichern'; }   // Fix: nach „neu aufnehmen" nicht in „Speichert…" hängen bleiben
    $id('pf-hint').textContent='Zeichne, wähle einen Filter und tippe ein Emoji zum Aufkleben.';
    bindCanvas(); render();
  }
  function render(){
    var cv=$id('pf-canvas'); if(!cv)return; var ctx=cv.getContext('2d');
    ctx.clearRect(0,0,OUT,OUT);
    if(photo){ var f=(filter&&filter!=='none'?filter+' ':'')+'brightness('+bri+')'; ctx.save(); ctx.filter=f; ctx.drawImage(photo,0,0,OUT,OUT); ctx.restore(); }
    else { ctx.fillStyle=bgColor; ctx.fillRect(0,0,OUT,OUT); }
    // Striche
    ctx.lineCap='round'; ctx.lineJoin='round';
    strokes.concat(curStroke?[curStroke]:[]).forEach(function(s){
      if(!s.pts.length)return;
      ctx.strokeStyle=s.color; ctx.lineWidth=s.w; ctx.beginPath();
      ctx.moveTo(s.pts[0].x,s.pts[0].y);
      for(var i=1;i<s.pts.length;i++)ctx.lineTo(s.pts[i].x,s.pts[i].y);
      ctx.stroke();
    });
    // Sticker
    ctx.textAlign='center'; ctx.textBaseline='middle';
    stickers.forEach(function(st){ ctx.font=st.size+'px serif'; ctx.fillText(st.emoji,st.x,st.y); });
  }
  function evtPos(e){
    var cv=$id('pf-canvas'); var r=cv.getBoundingClientRect();
    var p=(e.touches&&e.touches[0])||e;
    return { x:(p.clientX-r.left)/r.width*OUT, y:(p.clientY-r.top)/r.height*OUT };
  }
  function hitSticker(pos){
    for(var i=stickers.length-1;i>=0;i--){ var st=stickers[i]; var h=st.size*0.6;
      if(Math.abs(pos.x-st.x)<h&&Math.abs(pos.y-st.y)<h) return st; }
    return null;
  }
  var _bound=false;
  function bindCanvas(){
    if(_bound)return; _bound=true;
    var cv=$id('pf-canvas');
    function down(e){ e.preventDefault(); var pos=evtPos(e);
      if(tool==='draw'){ curStroke={color:color,w:10,pts:[pos]}; render(); }
      else { var st=hitSticker(pos); if(st){ selSticker=st; dragOff={x:pos.x-st.x,y:pos.y-st.y}; } }
    }
    function move(e){ if(!curStroke&&!selSticker)return; e.preventDefault(); var pos=evtPos(e);
      if(curStroke){ curStroke.pts.push(pos); render(); }
      else if(selSticker){ selSticker.x=pos.x-dragOff.x; selSticker.y=pos.y-dragOff.y; render(); }
    }
    function up(){ if(curStroke){ strokes.push(curStroke); curStroke=null; } selSticker=null; dragOff=null; }
    cv.addEventListener('pointerdown',down); cv.addEventListener('pointermove',move);
    window.addEventListener('pointerup',up);
  }
  window.pfSetTool=function(t){ tool=t; $id('pf-tool-draw').classList.toggle('active',t==='draw'); };
  window.pfSetColor=function(c,el){ color=c; tool='draw'; $id('pf-tool-draw').classList.add('active');
    document.querySelectorAll('.pf-swatch').forEach(function(s){s.classList.remove('active');}); if(el)el.classList.add('active'); };
  window.pfSetFilter=function(f,el){ filter=f; document.querySelectorAll('#pf-filters .pf-tool').forEach(function(b){b.classList.remove('active');}); if(el)el.classList.add('active'); render(); };
  window.pfSetBrightness=function(v){ bri=parseFloat(v)||1; render(); };
  window.pfAddSticker=function(emoji){ stickers.push({emoji:emoji,x:OUT/2,y:OUT/2,size:96}); tool='move'; $id('pf-tool-draw').classList.remove('active'); render(); };
  window.pfUndo=function(){ if(stickers.length&&strokes.length){ /* letztes Element entfernen, egal welcher Typ: nimm das jüngere */ }
    // einfache Heuristik: zuerst Sticker, dann Striche
    if(stickers.length>strokes.length) stickers.pop(); else if(strokes.length) strokes.pop(); else if(stickers.length) stickers.pop();
    render(); };
  window.pfRetake=function(){ photo=null; pfOpenCamera(); };

  window.pfSaveEdited=async function(){
    var btn=$id('pf-save-btn'); if(btn){btn.disabled=true;btn.textContent='Speichert…';}
    try{
      var cv=$id('pf-canvas');
      var blob=await new Promise(function(res){ cv.toBlob(res,'image/jpeg',0.9); });
      if(!blob) throw new Error('Kein Bild');
      var url=await uploadToCloudinary(blob);
      if(bannerMode){
        var okB=await saveBanner(url); if(!okB) throw new Error('Speichern fehlgeschlagen');
        applyBanner(url); pfCloseOverlay(); showToast('Profil gespeichert ✓');
      } else {
        var ok=await saveAvatar(url); if(!ok) throw new Error('Speichern fehlgeschlagen');
        applyAvatar($id('profile-avatar'),url,(myName()||'?').charAt(0));
        pfCloseOverlay(); showToast('Profilbild gespeichert ✓');
      }
    }catch(e){
      if(btn){btn.disabled=false;btn.textContent='Speichern';}
      $id('pf-hint').textContent='Fehler: '+(e&&e.message?e.message:e)+'  (Ist das Upload-Preset "'+AVATAR_PRESET+'" angelegt?)';
    }
  };

  // ── Vollbild anschauen ──
  window.pfViewAvatar=function(url){
    if(!url) return; injectCSS();
    var lb=$id('pf-lightbox');
    if(!lb){ lb=document.createElement('div'); lb.id='pf-lightbox';
      lb.innerHTML='<img id="pf-lightbox-img" alt="Profilbild"><button class="pf-btn" onclick="pfCloseLightbox()">Schließen</button>';
      lb.addEventListener('click',function(e){ if(e.target===lb)pfCloseLightbox(); }); document.body.appendChild(lb); }
    $id('pf-lightbox-img').src=url; lb.classList.add('show');
  };
  window.pfCloseLightbox=function(){ var lb=$id('pf-lightbox'); if(lb)lb.classList.remove('show'); };

  // ── Profil gestalten (Banner zeichnen, kein Foto) ──
  window.pfOpenBanner=function(){
    injectCSS(); injectMarkup(); bannerMode=true; photo=null;
    $id('pf-overlay').classList.add('show');
    enterEditor();
    $id('pf-title').textContent='Profil gestalten';
    $id('pf-hint').textContent='Gestalte dein Profil-Banner: zeichne und klebe Emojis auf.';
  };
  async function saveBanner(url){
    var name=myName(); if(!name) return false;
    try{ await sbFetch('players?name=ilike.'+encodeURIComponent(name),'PATCH',{profile_banner_url:url||null}); return true; }catch(e){ return false; }
  }
  function applyBanner(url){
    var hdr=document.querySelector('#profile-screen .profile-header'); if(!hdr) return;
    if(url){ hdr.classList.add('pf-has-banner'); pgSetBg(hdr,url); } else { hdr.classList.remove('pf-has-banner'); hdr.style.backgroundImage=''; }
  }
  function showAccountNumber(n){
    var info=document.querySelector('#profile-screen .profile-header-info'); if(!info) return;
    var el=$id('pf-acctnum'); if(!el){ el=document.createElement('div'); el.id='pf-acctnum'; el.className='pf-acctnum'; info.appendChild(el); }
    el.textContent = n?('Spieler #'+n):''; el.style.display = n?'':'none';
  }

  // ── Bild entfernen ──
  window.pfClearAvatar=async function(){
    var ok=await saveAvatar(null);
    applyAvatar($id('profile-avatar'),'',(myName()||'?').charAt(0));
    var av=$id('profile-avatar'); if(av){ av.onclick=null; av.style.cursor='default'; }
    var clr=$id('pf-clear-btn'); if(clr)clr.style.display='none';
    var cam=$id('pf-cam-btn'); if(cam)cam.textContent='📸 Profilbild aufnehmen';
    showToast(ok?'Profilbild entfernt ✓':'Fehler beim Entfernen');
  };

  // ══════════════════════════════════════════════════════════════
  //  Integration: Profilanzeige + Erst-Besuch-Prompt
  // ══════════════════════════════════════════════════════════════
  async function decorateProfile(viewedName){
    var name=viewedName||myName(); if(!name) return;
    var av=$id('profile-avatar');
    applyAvatar(av,cacheGet(name),name.charAt(0)); // sofort aus Cache
    var meta=await fetchMeta(name);
    var url=meta.avatar_url||''; cacheSet(name,url);
    applyAvatar(av,url,name.charAt(0));
    if(av){ av.onclick = url ? function(){ pfViewAvatar(url); } : null; av.style.cursor = url?'pointer':'default'; }
    applyBanner(meta.profile_banner_url||'');
    showAccountNumber(meta.account_number);
    if(meta.account_number&&window.routeProfileNum) routeProfileNum(meta.account_number);
    var own = loggedIn() && name.toLowerCase()===myName().toLowerCase();
    // KEIN zweiter Button mehr — den vorhandenen „Profil bearbeiten" (#profile-self-edit-btn) übernehmen,
    // er öffnet jetzt ein kleines Menü (Foto / Name / entfernen). Eventuelle alte Eigen-Buttons entfernen.
    ['pf-cam-btn','pf-clear-btn','pf-cust-btn','pf-edit-btn'].forEach(function(id){var b=$id(id);if(b)b.remove();});
    var seb=$id('profile-self-edit-btn');
    if(seb){ seb.style.display = own ? '' : 'none'; if(own) seb.onclick=function(){ pfOpenEditSheet(name); }; }
  }
  // kleines Menü hinter „Profil bearbeiten"
  window.pfOpenEditSheet=function(name){
    injectCSS();
    var has=!!cacheGet(myName());
    var d=$id('pf-sheet');
    if(!d){ d=document.createElement('div'); d.id='pf-sheet'; document.body.appendChild(d); d.addEventListener('click',function(e){ if(e.target===d)d.classList.remove('show'); }); }
    d.innerHTML='<div class="pf-sheet-box">'+
      '<div class="pf-sheet-title">Profil bearbeiten</div>'+
      '<button class="pf-btn primary" id="pf-sheet-photo">'+(has?'📸 Profilbild ändern':'📸 Profilbild aufnehmen')+'</button>'+
      (has?'<button class="pf-btn" id="pf-sheet-remove">🗑 Bild entfernen</button>':'')+
      '<button class="pf-btn" id="pf-sheet-name">✏️ Name ändern</button>'+
      '<button class="pf-btn" id="pf-sheet-cancel">Abbrechen</button>'+
    '</div>';
    function close(){ d.classList.remove('show'); }
    $id('pf-sheet-photo').onclick=function(){ close(); pfOpenCamera(); };
    if($id('pf-sheet-remove'))$id('pf-sheet-remove').onclick=function(){ close(); pfClearAvatar(); };
    $id('pf-sheet-name').onclick=function(){ close(); if(typeof openAdminEditPlayer==='function')openAdminEditPlayer(name); };
    $id('pf-sheet-cancel').onclick=close;
    d.classList.add('show');
  };
  // openProfile umhüllen (in patches.js definiert)
  function wrapOpenProfile(){
    if(typeof window.openProfile!=='function'){ setTimeout(wrapOpenProfile,300); return; }
    if(window.openProfile._pfWrapped) return;
    var orig=window.openProfile;
    window.openProfile=function(name,opts){ var r=orig.apply(this,arguments); try{ decorateProfile(name); }catch(e){} return r; };
    window.openProfile._pfWrapped=true;
  }

  // Erst-Besuch: kein Profilbild → einmal anbieten (abbrechbar)
  async function maybePromptFirstVisit(){
    if(!loggedIn()) return;
    var dec=0; try{ dec=parseInt(localStorage.getItem('pg_pfp_declined')||'0',10)||0; }catch(e){}
    if(dec>=2) return;                 // zweimal abgelehnt → nie wieder fragen
    var url=await fetchAvatar(myName());
    if(url) return;                    // hat schon ein Bild
    injectCSS();
    showFirstPrompt();                 // bei jedem Reload, bis 2× abgelehnt
  }
  window.pfPromptForPhoto=function(){ injectCSS(); showFirstPrompt(); };   // z.B. direkt nach Account-Erstellung
  function showFirstPrompt(){
    if($id('pf-firstscreen')) return;
    var d=document.createElement('div'); d.id='pf-firstscreen';
    d.innerHTML='<div class="pf-fs-emoji">📸</div>'+
      '<h2>Gib dir ein Gesicht!</h2>'+
      '<p>Nimm ein Profilbild mit der Kamera auf und bearbeite es mit Stift, Filtern und Emojis. Ganz optional, du kannst es überspringen.</p>'+
      '<div class="pf-row">'+
        '<button class="pf-btn primary" id="pf-fs-yes" style="padding:.7rem 1.3rem">Foto aufnehmen</button>'+
        '<button class="pf-btn" id="pf-fs-no" style="padding:.7rem 1.3rem">Überspringen</button>'+
      '</div>';
    document.body.appendChild(d); d.classList.add('show');
    $id('pf-fs-yes').onclick=function(){ d.remove(); pfOpenCamera(); };
    $id('pf-fs-no').onclick=function(){ try{var n=parseInt(localStorage.getItem('pg_pfp_declined')||'0',10)||0;localStorage.setItem('pg_pfp_declined',String(n+1));}catch(e){} d.remove(); };
  }

  // ── Boot ──
  function boot(){
    injectCSS(); wrapOpenProfile();
    setTimeout(maybePromptFirstVisit, 2500);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();

  // export für evtl. externe Nutzung
  window.pfFetchAvatar=fetchAvatar; window.pfApplyAvatar=applyAvatar; window.pgSetBg=pgSetBg;
})();
