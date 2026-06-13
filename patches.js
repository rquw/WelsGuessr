// patches.js: wird nach script.js geladen

// ── Profil: Stats pro Guessr-Standort (alle teilen dasselbe Supabase-Projekt) ──
// Tabellen sind pro Standort geprefixt; players/achievements sind geteilt (kontoweit).
var GUESSR_SITES = [
  { key:'ternberg', label:'Ternberg', scores:'scores',          daily:'daily_scores',          vsWinsKey:'tg_vs_wins' },
  { key:'wels',     label:'Wels',     scores:'wels_scores',     daily:'wels_daily_scores',     vsWinsKey:'wg_vs_wins' },
  { key:'scharten', label:'Scharten', scores:'scharten_scores', daily:'scharten_daily_scores', vsWinsKey:'sg_vs_wins' },
];
var CURRENT_SITE = 'wels';        // pro Repo: 'wels' bzw. 'scharten'
var _profileSite = CURRENT_SITE;       // aktuell im Profil gewählter Standort
var _profileName = null;               // aktuell angezeigter Spieler (für Re-Render bei Standortwechsel)
function _siteCfg(key){ return GUESSR_SITES.find(function(s){return s.key===key;}) || GUESSR_SITES[0]; }
// Standort im Profil umschalten (Buttons rufen das auf)
window.selectProfileSite = function(key){
  if(key===_profileSite) return;
  _profileSite = key;
  _renderProfileSiteTabs();
  if(_profileName) window.openProfile(_profileName, { keepSite:true });
};
function _renderProfileSiteTabs(){
  var wrap = document.getElementById('profile-site-tabs');
  if(!wrap) return;
  Array.prototype.forEach.call(wrap.children, function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-site')===_profileSite);
  });
}

// mehr achievements mit niedrigerer schwelle
(function() {
  var extra = [
    // punkte-meilensteine
    { key:'score_5k',   icon:'🥉', title:'Gut gemacht',       desc:'5.000+ Punkte in einem Spiel' },
    { key:'score_15k',  icon:'🥈', title:'Stark!',             desc:'15.000+ Punkte in einem Spiel' },

    // daily challenges
    { key:'daily_1',    icon:'📆', title:'Erster Tag',         desc:'Erste Daily Challenge gespielt' },
    { key:'daily_5',    icon:'🗓️', title:'Regelmäßig',        desc:'5 Daily Challenges gespielt' },
    { key:'daily_30',   icon:'🏅', title:'Monats-Profi',       desc:'30 Daily Challenges gespielt' },

    // streak
    { key:'streak_2',   icon:'✌️', title:'Zwei am Stück',      desc:'2 Tage in Folge gespielt' },
    { key:'streak_14',  icon:'📆🔥',title:'Zwei Wochen',       desc:'14 Tage in Folge gespielt' },

    // genauigkeit
    { key:'close_call', icon:'🎯', title:'Haarscharf!',        desc:'Unter 10 Meter entfernt geraten' },
    { key:'bullseye',   icon:'💥', title:'Volltreffer!',       desc:'Unter 2 Meter?? Du stehst quasi dort!!' },

    // hitzewelle
    { key:'survival_5', icon:'🌡️', title:'Halbzeit geschafft', desc:'5 Hitzewelle-Runden bestanden' },

    // sonstiges
    { key:'night_owl',  icon:'🦉', title:'Nachteule',          desc:'Nach Mitternacht gespielt' },
    { key:'vs_win',     icon:'⚔️', title:'Duell gewonnen',     desc:'Ein 1v1 gewonnen' },
  ];

  var existingKeys = new Set(ACHIEVEMENTS.map(function(a) { return a.key; }));
  extra.forEach(function(a) {
    if (!existingKeys.has(a.key)) ACHIEVEMENTS.push(a);
  });
})();

// safe closeModal ohne crash wenn backdrop fehlt
function safeCloseModal(id) {
  var bg = document.getElementById(id);
  if (!bg) return;
  bg.classList.remove('visible');
  var m = bg.querySelector('.modal');
  if (m) m.classList.remove('in');
  setTimeout(function() { bg.classList.remove('open'); }, 280);
}

// alles was DOM braucht
document.addEventListener('DOMContentLoaded', function() {

  // fehlende DOM-elemente einfügen

  // difficulty-display div → nach score-verdict
  if (!document.getElementById('difficulty-display')) {
    var verdict = document.getElementById('score-verdict');
    if (verdict) {
      var div = document.createElement('div');
      div.id = 'difficulty-display';
      div.style.cssText = 'display:none;text-align:center;margin:.3rem 0 0';
      verdict.parentNode.insertBefore(div, verdict.nextSibling);
    }
  }

  // score-chart canvas → vor final-breakdown
  if (!document.getElementById('score-chart')) {
    var breakdown = document.getElementById('final-breakdown');
    if (breakdown) {
      var canvas = document.createElement('canvas');
      canvas.id = 'score-chart';
      canvas.width = 320;
      canvas.height = 100;
      canvas.style.cssText = 'display:none;margin:.6rem auto;max-width:100%;border-radius:6px';
      breakdown.parentNode.insertBefore(canvas, breakdown);
    }
  }

  // heatmap-btn → nach share-btn im final screen
  if (!document.getElementById('heatmap-btn')) {
    var shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      var hBtn = document.createElement('button');
      hBtn.id = 'heatmap-btn';
      hBtn.className = 'big-btn';
      hBtn.textContent = '🌡 Heatmap';
      hBtn.style.display = 'none';
      hBtn.onclick = function() { openHeatmap(); };
      shareBtn.parentNode.insertBefore(hBtn, shareBtn.nextSibling);
    }
  }

  // Profil: Standort-Umschalter (Ternberg / Wels / Scharten) einfügen
  if (!document.getElementById('profile-site-tabs')) {
    var _pHeader = document.querySelector('#profile-screen .profile-header');
    if (_pHeader) {
      var tabs = document.createElement('div');
      tabs.id = 'profile-site-tabs';
      tabs.innerHTML = GUESSR_SITES.map(function(s){
        return '<button type="button" class="profile-site-tab' + (s.key===CURRENT_SITE?' active':'') +
          '" data-site="' + s.key + '" onclick="selectProfileSite(\'' + s.key + '\')">' + s.label + '</button>';
      }).join('');
      _pHeader.parentNode.insertBefore(tabs, _pHeader.nextSibling);
    }
  }

  // submitGuess patchen: ≤2m easter egg + afterGuessExtras de-dupe
  // script.js ruft afterGuessExtras() direkt, hier doppelte DB-Writes verhindern
  // indem wir afterGuessExtras überschreiben und nur _patchedAfterGuessExtras nutzen
  window.afterGuessExtras = function(locId) {
    _patchedAfterGuessExtras(locId);
  };

  var _origSubmitGuess = window.submitGuess;
  window.submitGuess = function() {
    // ≤2m easter egg: snap actual location to guess so dist=0, pts=5000
    if (S.guessLatLng && S.current) {
      var actual = getActualLatLng(S.current);
      var dist = haversine(S.guessLatLng.lat, S.guessLatLng.lng, actual.lat, actual.lng);
      if (dist <= 2) {
        // Temporarily override getActualLatLng so calcPts gets 0m
        var _origGetActual = window.getActualLatLng;
        window.getActualLatLng = function() {
          return { lat: S.guessLatLng.lat, lng: S.guessLatLng.lng };
        };
        _origSubmitGuess.apply(this, arguments);
        window.getActualLatLng = _origGetActual;
        // Fix the displayed distance to "0 m"
        setTimeout(function() {
          var distEl = document.getElementById('res-dist');
          if (distEl) distEl.textContent = '0 m';
        }, 50);
      } else {
        _origSubmitGuess.apply(this, arguments);
      }
    } else {
      _origSubmitGuess.apply(this, arguments);
    }
    // afterGuessExtras wird von script.js aufgerufen (oben überschrieben)
  };

  // afterFinalExtras überschreiben statt showFinal nochmal wrappen
  // (script.js ruft afterFinalExtras() schon selbst auf)
  window.afterFinalExtras = function() {
    _patchedAfterFinalExtras();
  };

  // openProfile: akzeptiert beliebigen spielernamen + dev-badge + Standortwahl
  window.openProfile = async function(playerName, opts) {
    var name = playerName || (S.isLoggedIn ? S.loggedInName : null);
    if (!name) return;
    opts = opts || {};
    _profileName = name;
    // Frisch geöffnet → auf den aktuellen Standort zurücksetzen; bei Standortwechsel beibehalten
    if (!opts.keepSite) _profileSite = CURRENT_SITE;
    var SITE = _siteCfg(_profileSite);

    // Leaderboard schließen, wenn offen
    var _lb = document.getElementById('lb-modal');
    if (_lb && _lb.classList.contains('open')) closeModal('lb-modal');

    show('profile-screen');
    _renderProfileSiteTabs();
    var el;
    el = document.getElementById('profile-name-display');
    if (el) { el.textContent = name; el.setAttribute('data-spitzname', name); el.removeAttribute('data-realname'); el.style.color = ''; }
    el = document.getElementById('profile-avatar');       if (el) el.textContent = name.charAt(0).toUpperCase();
    el = document.getElementById('profile-since');        if (el) el.textContent = '';

    // Eigenes Profil → Bearbeiten-Button anzeigen
    var _editBtn = document.getElementById('profile-self-edit-btn');
    if (_editBtn) {
      var _isOwn = S.isLoggedIn && S.loggedInName && S.loggedInName.toLowerCase() === name.toLowerCase();
      _editBtn.style.display = _isOwn ? '' : 'none';
      if (_isOwn) _editBtn.onclick = function(){ openAdminEditPlayer(name); };
    }

    // Badges: zurücksetzen, Entwickler sofort, Rest nach dem Laden
    var badgesEl = document.getElementById('profile-badges');
    if (badgesEl) badgesEl.innerHTML = '';
    function addBadge(cls, text) {
      if (!badgesEl) return;
      var b = document.createElement('span');
      b.className = 'profile-badge' + (cls ? ' ' + cls : '');
      b.textContent = text;
      badgesEl.appendChild(b);
    }
    if (name.toLowerCase() === 'fabio') {
      var devB = document.createElement('span');
      devB.className = 'dev-badge'; devB.style.marginTop = '0'; devB.textContent = '🛠 Entwickler';
      if (badgesEl) badgesEl.appendChild(devB);
    }
    var _isOwnProfile = S.isLoggedIn && S.loggedInName && S.loggedInName.toLowerCase() === name.toLowerCase();
    var _vsCell = document.getElementById('ps-vs-cell');
    if (_vsCell) _vsCell.style.display = _isOwnProfile ? '' : 'none';
    ['ps-games','ps-best','ps-avg','ps-total','ps-streak','ps-dailies','ps-ach','ps-rank','ps-vs'].forEach(function(id) {
      var e = document.getElementById(id); if (e) e.textContent = '…';
    });
    el = document.getElementById('profile-achievements');
    if (el) el.innerHTML = '<div style="font-size:.65rem;color:var(--mist)">Lade…</div>';
    el = document.getElementById('profile-recent-scores');
    if (el) el.innerHTML = '';

    try {
      var scores = await sbFetch(
        SITE.scores + '?name=ilike.' + encodeURIComponent(name) +
        '&select=score,created_at&order=created_at.desc&limit=100'
      );
      var games = scores ? scores.length : 0;
      var best  = games ? Math.max.apply(null, scores.map(function(r) { return r.score; })) : 0;
      var avg   = games ? Math.round(scores.reduce(function(a, r) { return a + r.score; }, 0) / games) : 0;

      el = document.getElementById('ps-games'); if (el) el.textContent = games;
      el = document.getElementById('ps-best');  if (el) el.textContent = fmtN(best);
      el = document.getElementById('ps-avg');   if (el) el.textContent = fmtN(avg);

      var dailyRows = await sbFetch(
        SITE.daily + '?name=ilike.' + encodeURIComponent(name) + '&select=id&limit=999'
      ).catch(function() { return []; });
      el = document.getElementById('ps-dailies');
      if (el) el.textContent = dailyRows ? dailyRows.length : 0;

      var playerRow = await sbFetch(
        'players?name=ilike.' + encodeURIComponent(name) +
        '&select=streak_count,streak_last_date,created_at'
      );
      if (playerRow && playerRow.length) {
        el = document.getElementById('ps-streak');
        if (el) el.textContent = (playerRow[0].streak_count || 0) + ' Tage';
        el = document.getElementById('profile-since');
        if (el && playerRow[0].created_at) {
          var d = new Date(playerRow[0].created_at);
          el.textContent = 'Dabei seit ' +
            d.toLocaleDateString('de-AT', { day:'2-digit', month:'long', year:'numeric' });
        }
      }

      // Vorname/Nachname für Hover, isoliert damit fehlende Spalten nicht crashen
      try {
        var _pinfo = await sbFetch('players?name=ilike.' + encodeURIComponent(name) + '&select=vorname,nachname');
        if (_pinfo && _pinfo.length && _pinfo[0].vorname) {
          var _rn = _pinfo[0].vorname + (_pinfo[0].nachname ? ' ' + _pinfo[0].nachname : '');
          var _nd = document.getElementById('profile-name-display');
          if (_nd) _nd.setAttribute('data-realname', _rn);
        }
      } catch(_) {}

      var achRows = await sbFetch(
        'achievements?player_name=ilike.' + encodeURIComponent(name) + '&select=achievement_key'
      );
      var haveKeys = new Set((achRows || []).map(function(r) { return r.achievement_key; }));
      var achHtml = ACHIEVEMENTS.map(function(a) {
        var on = haveKeys.has(a.key);
        return '<div class="ach-item' + (on ? '' : ' ach-locked') + '">' +
          '<span class="ach-icon">' + a.icon + '</span>' +
          '<div class="ach-info">' +
            '<div class="ach-title">' + a.title + '</div>' +
            '<div class="ach-desc">'  + a.desc  + '</div>' +
          '</div>' +
          (on ? '<span class="ach-check">✓</span>' : '') +
          '</div>';
      }).join('');
      el = document.getElementById('profile-achievements');
      if (el) el.innerHTML = achHtml ||
        '<div style="font-size:.65rem;color:var(--mist)">Noch keine Erfolge.</div>';

      // Gesamtpunkte + Erfolge-Zähler
      var total = (scores || []).reduce(function(a, r) { return a + (r.score || 0); }, 0);
      el = document.getElementById('ps-total'); if (el) el.textContent = fmtN(total);
      el = document.getElementById('ps-ach');   if (el) el.textContent = haveKeys.size + '/' + ACHIEVEMENTS.length;

      // Bestenlisten-Rang (bester Score je Spieler)
      var rank = null;
      try {
        var allRows = await sbFetch(SITE.scores + '?select=name,score&order=score.desc&limit=1000');
        var bestByName = {};
        (allRows || []).forEach(function(r) {
          if (!r.name) return; var k = r.name.toLowerCase();
          if (!bestByName[k] || r.score > bestByName[k]) bestByName[k] = r.score;
        });
        var ranked = Object.keys(bestByName).sort(function(a, b) { return bestByName[b] - bestByName[a]; });
        var idx = ranked.indexOf(name.toLowerCase());
        if (idx >= 0) rank = idx + 1;
      } catch (_) {}
      el = document.getElementById('ps-rank'); if (el) el.textContent = rank ? '#' + rank : '—';

      // Champion von gestern (Top der gestrigen Daily)
      var wasChampYesterday = false;
      try {
        var yKey = (typeof getYesterdayKey === 'function') ? getYesterdayKey() : null;
        if (yKey) {
          var yTop = await sbFetch(SITE.daily + '?date_key=eq.' + encodeURIComponent(yKey) + '&select=name,score&order=score.desc&limit=1');
          if (yTop && yTop.length && yTop[0].name && yTop[0].name.toLowerCase() === name.toLowerCase()) wasChampYesterday = true;
        }
      } catch (_) {}

      // Badges anhängen
      if (rank === 1) addBadge('badge-gold1', '🥇 Bestenliste #1');
      else if (rank === 2) addBadge('badge-gold2', '🥈 Bestenliste #2');
      else if (rank === 3) addBadge('badge-gold3', '🥉 Bestenliste #3');
      if (wasChampYesterday) addBadge('badge-champ', '👑 Champion von gestern');
      if (haveKeys.size >= ACHIEVEMENTS.length) addBadge('badge-allach', '🏅 Alle Errungenschaften');

      // 1v1-Siege (eigenes Profil, lokal getrackt)
      if (_isOwnProfile) {
        var vsWins = 0;
        try { vsWins = parseInt(localStorage.getItem(SITE.vsWinsKey) || '0', 10) || 0; } catch (_) {}
        el = document.getElementById('ps-vs'); if (el) el.textContent = vsWins;
      }

      var recentHtml = (scores || []).slice(0, 12).map(function(r) {
        var rd = new Date(r.created_at);
        return '<div class="profile-score-row">' +
          '<span>' + (typeof fmtDate === 'function' ? fmtDate(rd) : rd.toLocaleDateString('de-AT', { day:'2-digit', month:'2-digit', year:'numeric' })) + '</span>' +
          '<span class="gold">' + fmtN(r.score) + ' Pkt.</span>' +
          '</div>';
      }).join('');
      el = document.getElementById('profile-recent-scores');
      if (el) el.innerHTML = recentHtml ||
        '<div style="font-size:.65rem;color:var(--mist)">Noch keine Spiele.</div>';

    } catch(e) {
      console.error('[profile]', e);
      el = document.getElementById('profile-achievements');
      if (el) el.innerHTML = '<div style="font-size:.65rem;color:#e8826a">Fehler beim Laden.</div>';
    }
  };

  // Leaderboard-Namen nicht mehr anklickbar, nur der 👤-Button öffnet das Profil
  function wireProfileClicks(listId) { /* deaktiviert */ }

  var _origLoadLb = window.loadLeaderboardData;
  if (_origLoadLb) {
    window.loadLeaderboardData = async function() {
      await _origLoadLb.apply(this, arguments);
      wireProfileClicks('lb-list');
    };
  }


  var _origLoadDaily = window.loadDailyBoard;
  if (_origLoadDaily) {
    window.loadDailyBoard = async function() {
      await _origLoadDaily.apply(this, arguments);
      wireProfileClicks('daily-lb-list');
      wireProfileClicks('daily-champs-list');
    };
  }

  // checkAndUnlockAchievements: extra achievements aus der erweiterung
  var _origCheck = window.checkAndUnlockAchievements;
  window.checkAndUnlockAchievements = async function(opts) {
    // Call original first
    await _origCheck.apply(this, arguments);

    // Now handle the extra achievements
    if (!S.isLoggedIn) return;
    var session = loadSession();
    if (!session || !session.name) return;
    try {
      var existing = await sbFetch(
        'achievements?player_name=ilike.' + encodeURIComponent(session.name) + '&select=achievement_key'
      );
      var have = new Set((existing || []).map(function(r) { return r.achievement_key; }));
      var toUnlock = [];

      // More forgiving score milestones
      if (opts.totalScore >= 5000  && !have.has('score_5k'))   toUnlock.push('score_5k');
      if (opts.totalScore >= 15000 && !have.has('score_15k'))  toUnlock.push('score_15k');

      // Daily milestones
      if (opts.dailyCount >= 1  && !have.has('daily_1'))   toUnlock.push('daily_1');
      if (opts.dailyCount >= 5  && !have.has('daily_5'))   toUnlock.push('daily_5');
      if (opts.dailyCount >= 30 && !have.has('daily_30'))  toUnlock.push('daily_30');

      // Streak (more forgiving)
      if (opts.streak >= 2  && !have.has('streak_2'))   toUnlock.push('streak_2');
      if (opts.streak >= 14 && !have.has('streak_14'))  toUnlock.push('streak_14');

      // Accuracy (passed in via opts.minDist)
      if (opts.minDist !== undefined) {
        if (opts.minDist <= 10 && !have.has('close_call')) toUnlock.push('close_call');
        if (opts.minDist <= 2  && !have.has('bullseye'))   toUnlock.push('bullseye');
      }

      // Survival partial
      if (opts.survivalRound >= 5 && !have.has('survival_5')) toUnlock.push('survival_5');

      // Night owl
      if (opts.nightOwl && !have.has('night_owl')) toUnlock.push('night_owl');

      // VS win
      if (opts.vsWin && !have.has('vs_win')) toUnlock.push('vs_win');

      for (var i = 0; i < toUnlock.length; i++) {
        var key = toUnlock[i];
        try { await sbFetch('achievements', 'POST', { player_name: session.name, achievement_key: key }); } catch(e) {}
        var def = ACHIEVEMENTS.find(function(a) { return a.key === key; });
        if (def) showAchievementToast(def);
      }
    } catch(e) { console.error('[achievements extra]', e); }
  };

  // minDist tracken für achievements (bullseye/close_call)
  // submitGuess ist oben schon gewrapped, hier nur der minDist-Tracker
  var _origSGWithDist = window.submitGuess;
  window.submitGuess = function() {
    if (S.guessLatLng && S.current) {
      var actual2 = getActualLatLng(S.current);
      var d2 = haversine(S.guessLatLng.lat, S.guessLatLng.lng, actual2.lat, actual2.lng);
      if (!S.minDist || d2 < S.minDist) S.minDist = d2;
    }
    _origSGWithDist.apply(this, arguments);
  };

  // styles für ach-items, profile-rows, diff-display etc.
  var style = document.createElement('style');
  style.textContent = [
    '.leaflet-tooltip.hm-tip{background:rgba(20,18,14,.9)!important;border:none!important;',
    'color:#f5f0e8!important;font-size:.65rem!important;padding:.2rem .45rem!important;border-radius:4px!important;}',
    '.leaflet-tooltip.hm-tip::before{display:none!important;}',
    '.ach-item{display:flex;align-items:center;gap:.6rem;padding:.5rem .55rem;border-radius:8px;',
    'background:rgba(255,255,255,.04);margin-bottom:.3rem;}',
    '.ach-item.ach-locked{opacity:.32;filter:grayscale(.9);}',
    '.ach-icon{font-size:1.25rem;flex-shrink:0;}',
    '.ach-info{flex:1;min-width:0;}',
    '.ach-title{font-size:.72rem;font-weight:600;color:#f5f0e8;}',
    '.ach-desc{font-size:.6rem;color:var(--mist);margin-top:.08rem;}',
    '.ach-check{font-size:.8rem;color:#7dcc6a;flex-shrink:0;}',
    '.profile-score-row{display:flex;justify-content:space-between;padding:.38rem .05rem;',
    'border-bottom:1px solid rgba(255,255,255,.05);font-size:.7rem;color:var(--mist);}',
    '.profile-score-row:last-child{border-bottom:none;}',
    '#difficulty-display .diff-display-badge{display:inline-flex;align-items:center;gap:.35rem;',
    'font-size:.65rem;color:var(--mist);padding:.28rem .6rem;background:rgba(255,255,255,.05);',
    'border-radius:20px;margin-top:.3rem;}',
    '#difficulty-display .diff-label-text{color:#f5f0e8;font-weight:600;}',
    '#difficulty-display .diff-count{font-size:.58rem;opacity:.55;}',
    '.lb-list .lb-name:hover,#daily-lb-list .lb-name:hover{text-decoration:underline;cursor:pointer;}',
    '#profile-site-tabs{display:flex;gap:.4rem;justify-content:center;flex-wrap:wrap;margin:.1rem 0 1rem;}',
    '.profile-site-tab{font-family:"DM Mono",monospace;font-size:.66rem;letter-spacing:.04em;padding:.4rem .95rem;border-radius:20px;border:1.5px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:var(--mist);cursor:pointer;transition:border-color .15s,color .15s,background .15s,transform .1s;}',
    '.profile-site-tab:hover{border-color:rgba(255,255,255,.32);color:var(--cream);}',
    '.profile-site-tab.active{border-color:var(--gold);color:var(--gold);background:rgba(201,168,76,.12);}',
  ].join('');
  document.head.appendChild(style);

  // combo und minDist bei spielstart zurücksetzen
  var _origStartSolo = window.startSolo;
  if (_origStartSolo) window.startSolo = function() { S.minDist = null; _origStartSolo.apply(this, arguments); };
  var _origStartSurvival = window.startSurvival;
  if (_origStartSurvival) window.startSurvival = function() { S.minDist = null; _origStartSurvival.apply(this, arguments); };

  // vs-panel-grid: display flex statt grid wenn nur ein panel sichtbar
  var _origShowVsPanel = window.showVsPanel;
  if (_origShowVsPanel) {
    window.showVsPanel = function(which) {
      _origShowVsPanel.apply(this, arguments);
      var grid = document.getElementById('vs-panel-grid');
      if (grid) grid.style.display = 'flex';
    };
  }
});

// afterGuessExtras intern (spiegelt script.js)
function _patchedAfterGuessExtras(locId) {
  saveGuessToDb(locId);
  if (!locId) return;
  setTimeout(function() {
    if (typeof showOtherGuessesOnResultMap === 'function') showOtherGuessesOnResultMap(locId);
    if (typeof loadAndShowDifficultyDisplay === 'function') loadAndShowDifficultyDisplay(locId);
    if (typeof loadDifficultyBadge === 'function') loadDifficultyBadge(locId);
    var inlineRating = document.getElementById('inline-diff-rating');
    if (inlineRating && typeof _diffRated !== 'undefined' && !_diffRated.has(locId)) {
      inlineRating.style.display = 'block';
      if (typeof _diffPendingLocId !== 'undefined') _diffPendingLocId = locId;
      var stars = inlineRating.querySelectorAll('.diff-star');
      stars.forEach(function(star) {
        star.onmouseover = function() {
          var r = parseInt(star.getAttribute('data-r'));
          stars.forEach(function(s) { s.classList.toggle('hover', parseInt(s.getAttribute('data-r')) <= r); });
        };
        star.onmouseout = function() { stars.forEach(function(s) { s.classList.remove('hover'); }); };
      });
    }
  }, 600);
}

async function _loadDifficultyDisplay(locId) {
  var el = document.getElementById('difficulty-display');
  if (!el) return;
  try {
    var rows = await sbFetch(
      'location_ratings?location_id=eq.' + encodeURIComponent(locId) + '&select=rating'
    );
    if (!rows || !rows.length) { el.style.display = 'none'; return; }
    var avg    = rows.reduce(function(a, r) { return a + r.rating; }, 0) / rows.length;
    var labels = ['','Sehr einfach','Einfach','Normal','Schwer','Sehr schwer'];
    var label  = labels[Math.round(avg)] || 'Normal';
    var count  = rows.length + (rows.length === 1 ? ' Bewertung' : ' Bewertungen');
    el.style.display = 'block';
    el.innerHTML =
      '<div class="diff-display-badge">Schwierigkeit: ' +
      '<span class="diff-label-text">' + label + '</span>' +
      ' <span class="diff-count">(' + count + ')</span></div>';
  } catch(e) { el.style.display = 'none'; }
}

// afterFinalExtras intern
function _patchedAfterFinalExtras() {
  _drawPatchedScoreChart();

  var hb = document.getElementById('heatmap-btn');
  if (hb) hb.style.display = 'none';

  if (!S.isLoggedIn) return;
  sbFetch('players?name=ilike.' + encodeURIComponent(S.loggedInName) + '&select=streak_count')
    .then(function(r) {
      var streak = (r && r.length) ? (r[0].streak_count || 0) : 0;
      var dailyCount = 0;
      try { for (var k in localStorage) { if (k.startsWith('wg_daily_done_')) dailyCount++; } } catch(e) {}
      var hour = new Date().getHours();
      checkAndUnlockAchievements({
        firstGame:     true,
        perfectRound:  S.roundScores && S.roundScores.some(function(r) { return r.pts >= 4990; }),
        streak:        streak,
        totalScore:    S.score,
        survivalWin:   S.mode === 'survival' && !S.survivalEliminated && S.round >= S.roundsTotal - 1,
        survivalRound: S.mode === 'survival' ? (S.round || 0) : 0,
        dailyCount:    dailyCount,
        minDist:       S.minDist,
        nightOwl:      (hour >= 0 && hour < 5),
        vsWin:         S.isVs && S.vsWon,
      });
    }).catch(function() {});
}

// heatmap: eigene openHeatmap mit clustering
var _heatmapInst = null;
window.openHeatmap = function() {
  openModal('heatmap-modal');
  var hintEl = document.getElementById('heatmap-hint');
  if (hintEl) hintEl.textContent = 'Lade…';
  setTimeout(async function() {
    if (_heatmapInst) { try { _heatmapInst.remove(); } catch(e) {} _heatmapInst = null; }
    _heatmapInst = L.map('heatmap-el', {
      center:[47.947,14.358], zoom:13, attributionControl:false, zoomControl:true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(_heatmapInst);
    setTimeout(function(){if(_heatmapInst)_heatmapInst.invalidateSize();},250);
    try {
      var isDaily = (S.mode === 'daily');
      var locId   = S.current ? S.current.id : null;
      var path    = isDaily
        ? 'wels_daily_guesses?date_key=eq.' + getViennaDateKey() + '&select=guess_lat,guess_lng&limit=500'
        : locId ? 'wels_daily_guesses?location_id=eq.' + encodeURIComponent(locId) + '&select=guess_lat,guess_lng&limit=300'
        : null;
      if (!path) { if(hintEl) hintEl.textContent='Keine Daten.'; return; }
      var rows = await sbFetch(path);
      if (!rows || !rows.length) { if(hintEl) hintEl.textContent='Noch keine Daten.'; return; }
      var R=0.00035, cells={};
      rows.forEach(function(row){
        var key=Math.round(row.guess_lat/R)+'_'+Math.round(row.guess_lng/R);
        if(!cells[key]) cells[key]={sumLat:0,sumLng:0,count:0};
        cells[key].sumLat+=row.guess_lat; cells[key].sumLng+=row.guess_lng; cells[key].count++;
      });
      var vals=Object.values(cells);
      var maxC=Math.max.apply(null,vals.map(function(c){return c.count;}));
      var bounds=[];
      vals.forEach(function(cell){
        var lat=cell.sumLat/cell.count, lng=cell.sumLng/cell.count;
        var density=cell.count/maxC;
        L.circleMarker([lat,lng],{
          radius:5+Math.round(density*14),
          color:density<0.25?'#6fa8dc':density<0.6?'#d4a94c':'#e0542a',
          fillColor:density<0.25?'#6fa8dc':density<0.6?'#d4a94c':'#e0542a',
          fillOpacity:0.22+density*0.65, weight:0
        }).addTo(_heatmapInst)
          .bindTooltip(cell.count+(cell.count===1?' Tipp':' Tipps'),{sticky:true,className:'hm-tip'});
        bounds.push([lat,lng]);
      });
      if(bounds.length) _heatmapInst.fitBounds(L.latLngBounds(bounds).pad(0.3));
      if(hintEl) hintEl.textContent=rows.length+(isDaily?' Tipps von heute':' Tipps für diesen Spot')+'  ·  Größe = Häufigkeit';
    } catch(e) { console.error('[heatmap]',e); if(hintEl) hintEl.textContent='Fehler beim Laden.'; }
  },300);
};

// score chart (wird in afterFinalExtras gezeichnet)
function _drawPatchedScoreChart() {
  var canvas = document.getElementById('score-chart');
  if (!canvas || !S.roundScores || !S.roundScores.length) return;
  canvas.style.display = 'block';
  var ctx=canvas.getContext('2d'), W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  var scores=S.roundScores.map(function(r){return r.pts||0;});
  var n=scores.length, max=Math.max.apply(null,scores.concat([1]));
  var padL=8,padR=8,padT=14,padB=18;
  var plotW=W-padL-padR, plotH=H-padT-padB;
  var slotW=plotW/n, barW=Math.min(slotW*0.6,32);
  ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1;
  ctx.setLineDash([3,4]);
  ctx.beginPath(); ctx.moveTo(padL,padT); ctx.lineTo(W-padR,padT); ctx.stroke();
  ctx.setLineDash([]);
  scores.forEach(function(s,i){
    var x=padL+i*slotW+slotW/2-barW/2;
    var barH=Math.max(3,Math.round((s/max)*plotH));
    var y=padT+plotH-barH;
    var grad=ctx.createLinearGradient(x,y,x,padT+plotH);
    if(s>=4800){grad.addColorStop(0,'#f0e080');grad.addColorStop(1,'#c9a030');}
    else if(s>=3000){grad.addColorStop(0,'#a0d870');grad.addColorStop(1,'#507838');}
    else if(s>=1200){grad.addColorStop(0,'#88a8c0');grad.addColorStop(1,'#3c5870');}
    else{grad.addColorStop(0,'#d07060');grad.addColorStop(1,'#7a2010');}
    ctx.fillStyle=grad;
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x,y,barW,barH,[3,3,0,0]);
    else ctx.rect(x,y,barW,barH);
    ctx.fill();
    if(s>0){
      ctx.fillStyle=s>=4800?'#f0e080':s>=3000?'#a8d870':'rgba(245,240,232,0.55)';
      ctx.font='bold 7.5px "DM Mono",monospace';
      ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText(s>=1000?(Math.round(s/100)/10)+'k':String(s),x+barW/2,y-2);
    }
    ctx.fillStyle='rgba(245,240,232,0.38)';
    ctx.font='7px "DM Mono",monospace'; ctx.textBaseline='top';
    ctx.fillText('R'+(i+1),x+barW/2,padT+plotH+3);
  });
}


