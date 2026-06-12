// nav.js: Fahr-Navigation zwischen Panoramen. Lädt nach script.js/patches.js.
// Fahren = Wechsel zum Nachbar-Pano, Nachbarn werden je Ankunft berechnet.
// Score bleibt am Start-Pano (S.current), wir zeigen nur ein anderes Pano via NAV.viewId.
(function () {
  'use strict';

  var MAX_LINK_DIST = 22;   // m: max Distanz für einen Nachbar-Pfeil
  var MIN_ARROW_SEP = 10;   // Grad: min Winkelabstand zwischen Pfeilen
  var MAX_ARROWS    = 3;    // max Pfeile gleichzeitig
  var MIN_DIST_FLOOR = 2;   // m: darunter gleiches Pano (dedupe)

  // planare Näherung, reicht auf Straßen-Skala
  var DEG = Math.PI / 180;
  function metersBetween(a, b) {
    var dx = (b.lng - a.lng) * Math.cos(a.lat * DEG) * 111320;
    var dy = (b.lat - a.lat) * 111320;
    return { dx: dx, dy: dy, dist: Math.sqrt(dx * dx + dy * dy) };
  }
  // kürzeste Winkeldifferenz a→b, (-180..180]
  function angleDiff(a, b) { return ((b - a + 540) % 360) - 180; }

  // State
  var NAV = {
    viewId: null,    // aktuell angezeigtes Pano (nach Fahren != S.current)
    startId: null,   // Start-Pano der Runde (zu raten, Score-Quelle)
    arrows: [],      // [{id, bearing, dist}]
    locked: false,   // Transition läuft, Eingaben ignorieren
    els: [],         // Pfeil-DOM-Elemente
  };
  window.NAV = NAV;

  function $id(id) { return document.getElementById(id); }
  function locById(id) {
    if (typeof LOCATIONS === 'undefined') return null;
    for (var i = 0; i < LOCATIONS.length; i++) if (LOCATIONS[i].id === id) return LOCATIONS[i];
    return null;
  }
  function gameActive() {
    var g = $id('game-screen');
    return !!(g && g.classList.contains('active'));
  }

  // Nachbarn finden
  function computeNeighbors(loc) {
    if (!loc || typeof LOCATIONS === 'undefined') return [];
    var cands = [];
    for (var i = 0; i < LOCATIONS.length; i++) {
      var q = LOCATIONS[i];
      if (q.id === loc.id) continue;
      var m = metersBetween(loc, q);
      if (m.dist < MIN_DIST_FLOOR) continue;      // dedupe
      if (m.dist > MAX_LINK_DIST) continue;
      cands.push({ id: q.id, dist: m.dist, bearing: (Math.atan2(m.dx, m.dy) / DEG + 360) % 360 });
    }
    cands.sort(function (a, b) { return a.dist - b.dist; }); // nächste zuerst
    // pro Richtung nur einen: nehmen wenn weit genug von den bisherigen
    var picked = [];
    for (var j = 0; j < cands.length && picked.length < MAX_ARROWS; j++) {
      var c = cands[j], ok = true;
      for (var k = 0; k < picked.length; k++) {
        if (Math.abs(angleDiff(picked[k].bearing, c.bearing)) < MIN_ARROW_SEP) { ok = false; break; }
      }
      if (ok) picked.push(c);
    }
    return picked;
  }

  // Overlay / Style
  function injectStyle() {
    if ($id('nav-style')) return;
    var s = document.createElement('style');
    s.id = 'nav-style';
    s.textContent =
      '#nav-arrows{position:absolute;inset:0;z-index:25;pointer-events:none;overflow:hidden}' +
      '.nav-arrow{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;cursor:pointer;' +
        'width:120px;height:120px;display:flex;align-items:center;justify-content:center;' +
        'transition:opacity .12s ease, filter .12s ease;will-change:left,top,transform}' +
      '.nav-arrow svg{width:62px;height:62px;display:block;filter:drop-shadow(0 3px 6px rgba(0,0,0,.55))}' +
      '.nav-arrow .nav-chev{fill:rgba(245,240,232,.82);stroke:rgba(0,0,0,.35);stroke-width:3;' +
        'transition:fill .12s ease}' +
      '.nav-arrow .nav-disc{fill:rgba(0,0,0,.28)}' +
      '.nav-arrow:hover .nav-chev{fill:var(--gold,#c9a84c)}' +
      '.nav-arrow:hover{filter:brightness(1.12)}' +
      '.nav-locked .nav-arrow{pointer-events:none;opacity:0!important}' +
      // Start-Erinnerung: zeigt beim Kartenkontakt das Start-Pano
      '#start-reminder{position:absolute;inset:0;z-index:28;overflow:hidden;opacity:0;pointer-events:none;' +
        'transition:opacity .28s ease;background:#111}' +
      '#start-reminder.show{opacity:1}' +
      '#start-reminder .sr-strip{display:flex;width:max-content;height:100%}' +
      '#start-reminder .sr-strip img{height:100%;width:auto;flex-shrink:0;display:block;user-select:none;-webkit-user-drag:none}' +
      '#start-reminder .sr-vignette{position:absolute;inset:0;pointer-events:none;' +
        'box-shadow:inset 0 0 0 3px rgba(201,168,76,.6), inset 0 0 80px rgba(0,0,0,.45)}' +
      '#start-reminder .sr-label{position:absolute;top:1rem;left:50%;transform:translateX(-50%);' +
        'background:rgba(0,0,0,.66);border:1px solid rgba(201,168,76,.55);border-radius:20px;' +
        'padding:.42rem .9rem;font-family:\'DM Mono\',monospace;font-size:.66rem;letter-spacing:.06em;' +
        'color:var(--gold-light,#e8c86a);white-space:nowrap;backdrop-filter:blur(6px);' +
        'box-shadow:0 4px 16px rgba(0,0,0,.4)}' +
      // "Zurück zum Startpunkt"-Button, unten mittig wenn weggefahren
      '#nav-return{position:absolute;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:26;' +
        'display:none;align-items:center;gap:.45rem;cursor:pointer;' +
        'font-family:\'DM Mono\',monospace;font-size:.66rem;letter-spacing:.06em;white-space:nowrap;' +
        'padding:.5rem 1.05rem;border-radius:22px;color:var(--gold-light,#e8c86a);' +
        'background:rgba(0,0,0,.62);border:1.5px solid rgba(201,168,76,.5);backdrop-filter:blur(6px);' +
        'box-shadow:0 4px 18px rgba(0,0,0,.45);transition:background .15s,border-color .15s,transform .12s,opacity .2s}' +
      '#nav-return.show{display:flex}' +
      '#nav-return:hover{background:rgba(201,168,76,.2);border-color:var(--gold-light,#e8c86a);' +
        'transform:translateX(-50%) translateY(-2px)}' +
      '#nav-return:active{transform:translateX(-50%) translateY(0)}' +
      '@media(max-width:768px){#nav-return{bottom:calc(165px + 1.2rem);font-size:.6rem;padding:.42rem .85rem}}' +
      // Karte muss über der Start-Erinnerung liegen
      '#map-panel{z-index:40}';
    document.head.appendChild(s);
  }

  function ensureOverlay() {
    injectStyle();
    var cont = $id('pano-container');
    if (!cont) return null;
    var ov = $id('nav-arrows');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'nav-arrows';
      cont.appendChild(ov);
    }
    ensureReturnBtn();
    return ov;
  }

  // "Zurück zum Startpunkt"-Button
  function ensureReturnBtn() {
    var cont = $id('pano-container');
    if (!cont) return null;
    var btn = $id('nav-return');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'nav-return';
      btn.type = 'button';
      btn.innerHTML = '↩ Zurück zum Startpunkt';
      btn.addEventListener('click', function (e) { e.stopPropagation(); returnToStart(); });
      cont.appendChild(btn);
    }
    return btn;
  }
  function updateReturnBtn() {
    var btn = ensureReturnBtn();
    if (!btn) return;
    if (drivenAway() && !NAV.locked) btn.classList.add('show');
    else btn.classList.remove('show');
  }
  // springt zurück zum Start-Pano
  function returnToStart() {
    if (NAV.locked || !NAV.startId || NAV.viewId === NAV.startId) return;
    var target = locById(NAV.startId);
    if (!target) return;
    NAV.locked = true;
    var ov = $id('nav-arrows'); if (ov) ov.classList.add('nav-locked');
    updateReturnBtn();
    preload(target.id).then(function () {
      buildStrip(target.id);
      if (typeof S !== 'undefined') { S.panoZoom = 1; S.panoVOff = 0; }
      if (typeof updatePanoZoom === 'function') updatePanoZoom();
      if (typeof updatePano === 'function') updatePano();
      finishDrive(target);
    });
  }

  // Bodenchevron, zeigt nach vorn
  function arrowSVG() {
    return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse class="nav-disc" cx="32" cy="46" rx="22" ry="9"/>' +
      '<path class="nav-chev" d="M32 12 L52 40 L40 40 L40 52 L24 52 L24 40 L12 40 Z"/>' +
      '</svg>';
  }

  function renderArrows() {
    var ov = ensureOverlay();
    if (!ov) return;
    ov.innerHTML = '';
    NAV.els = [];
    NAV.arrows.forEach(function (arrow) {
      var el = document.createElement('div');
      el.className = 'nav-arrow';
      el.innerHTML = arrowSVG();
      el.title = 'Hierhin fahren';
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        driveTo(arrow);
      });
      el._arrow = arrow;
      ov.appendChild(el);
      NAV.els.push(el);
    });
    positionArrows();
  }

  // Breite eines 90°-Bildes in px (1 Bild = 90° FOV)
  function imageWidth() {
    var strip = $id('pano-strip');
    if (!strip) return 0;
    return strip.scrollWidth / 8; // 8 Bilder im Strip
  }

  // Bearing → x-Pixel: 0.5*IW + (angleDiff(yaw,B)/90)*IW
  function positionArrows() {
    var cont = $id('pano-container');
    if (!cont || !NAV.els.length) return;
    var IW = imageWidth();
    if (!IW) return;
    var W = cont.clientWidth, H = cont.clientHeight;
    var yaw = (typeof S !== 'undefined' && typeof S.panoAngle === 'number') ? S.panoAngle : 0;
    NAV.els.forEach(function (el) {
      var d = angleDiff(yaw, el._arrow.bearing);     // -180..180
      var x = 0.5 * IW + (d / 90) * IW;
      // hinter der Kamera nach rechts wrappen (+360° = +4*IW)
      if (x < -0.35 * IW) x += 4 * IW;
      var visible = x >= -0.35 * IW && x <= W + 0.35 * IW;
      if (!visible) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; return; }
      // näher = tiefer und größer
      var t = Math.max(0, Math.min(1, (el._arrow.dist - MIN_DIST_FLOOR) / (MAX_LINK_DIST - MIN_DIST_FLOOR)));
      var y = H * (0.80 - 0.14 * t);
      var scale = 1.12 - 0.42 * t;
      // an den Rändern ausblenden
      var edge = Math.min(x, W - x);
      var fade = Math.max(0, Math.min(1, edge / (0.28 * IW)));
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.transform = 'translate(-50%,-50%) scale(' + scale.toFixed(3) + ')';
      el.style.opacity = (0.55 + 0.45 * fade).toFixed(3);
      el.style.pointerEvents = NAV.locked ? 'none' : 'auto';
    });
  }

  // Bearing in der Blickmitte (für Vor/Zurück-Tasten)
  function centerBearing() {
    var cont = $id('pano-container');
    var IW = imageWidth();
    var yaw = (typeof S !== 'undefined' && typeof S.panoAngle === 'number') ? S.panoAngle : 0;
    if (!cont || !IW) return yaw;
    var dCenter = ((cont.clientWidth / 2) - 0.5 * IW) / IW * 90;
    return yaw + dCenter;
  }
  function nearestArrow(targetBearing, maxOff) {
    var best = null, bestDiff = maxOff;
    NAV.arrows.forEach(function (a) {
      var diff = Math.abs(angleDiff(targetBearing, a.bearing));
      if (diff <= bestDiff) { bestDiff = diff; best = a; }
    });
    return best;
  }

  // Bildaufbau, ohne Yaw-Reset (anders als loadPano)
  function preload(id) {
    return new Promise(function (resolve) {
      var left = 4, done = false;
      function fin() { if (!done) { done = true; resolve(); } }
      [0, 90, 180, 270].forEach(function (h) {
        var im = new Image();
        im.onload = im.onerror = function () { if (--left === 0) fin(); };
        im.src = 'images/' + id + '_h' + String(h).padStart(3, '0') + '.jpg';
      });
      setTimeout(fin, 700); // Fallback
    });
  }
  function buildStrip(id) {
    var strip = $id('pano-strip');
    if (!strip) return;
    strip.innerHTML = '';
    [0, 90, 180, 270, 0, 90, 180, 270].forEach(function (h) {
      var img = document.createElement('img');
      img.src = 'images/' + id + '_h' + String(h).padStart(3, '0') + '.jpg';
      img.draggable = false;
      img.oncontextmenu = function (e) { e.preventDefault(); };
      strip.appendChild(img);
    });
  }

  // Start-Erinnerung: blendet bei Kartenkontakt das Start-Pano ein,
  // falls man weggefahren ist und nicht mehr weiß, was zu raten ist.
  function ensureReminder() {
    var cont = $id('pano-container');
    if (!cont) return null;
    var el = $id('start-reminder');
    if (!el) {
      el = document.createElement('div');
      el.id = 'start-reminder';
      var strip = document.createElement('div'); strip.className = 'sr-strip';
      var vig = document.createElement('div'); vig.className = 'sr-vignette';
      var lbl = document.createElement('div'); lbl.className = 'sr-label';
      lbl.textContent = '📍 Von hier musst du raten!';
      el.appendChild(strip); el.appendChild(vig); el.appendChild(lbl);
      cont.appendChild(el);
    }
    return el;
  }
  function setReminderImages(id) {
    var el = ensureReminder(); if (!el || !id) return;
    var strip = el.querySelector('.sr-strip'); strip.innerHTML = '';
    [0, 90, 180, 270, 0, 90, 180, 270].forEach(function (h) {
      var img = document.createElement('img');
      img.src = 'images/' + id + '_h' + String(h).padStart(3, '0') + '.jpg';
      img.draggable = false; img.oncontextmenu = function (e) { e.preventDefault(); };
      strip.appendChild(img);
    });
  }
  function drivenAway() { return !!(NAV.startId && NAV.viewId && NAV.viewId !== NAV.startId); }
  // dreht die Erinnerung langsam, Strip ist verdoppelt = nahtlose Schleife
  var _remRAF = null, _remStart = 0, _remBaseYaw = 0;
  var REMINDER_DEG_PER_SEC = 10;
  function animateReminder() {
    var el = $id('start-reminder');
    if (!el || !el.classList.contains('show')) { _remRAF = null; return; }
    var strip = el.querySelector('.sr-strip'); var hw = strip ? strip.scrollWidth / 2 : 0;
    if (hw) {
      var yaw = _remBaseYaw + (performance.now() - _remStart) / 1000 * REMINDER_DEG_PER_SEC;
      var yawNorm = ((yaw % 360) + 360) % 360;
      strip.style.transform = 'translateX(-' + (yawNorm / 360 * hw) + 'px)';
    }
    _remRAF = requestAnimationFrame(animateReminder);
  }
  function showReminder() {
    if (!drivenAway()) return;          // nur wenn weggefahren
    var el = ensureReminder(); if (!el) return;
    _remBaseYaw = (typeof S !== 'undefined' && typeof S.panoAngle === 'number') ? S.panoAngle : 0;
    _remStart = performance.now();
    el.classList.add('show');
    if (_remRAF) cancelAnimationFrame(_remRAF);
    _remRAF = requestAnimationFrame(animateReminder);
  }
  function hideReminder() {
    var el = $id('start-reminder'); if (el) el.classList.remove('show');
    if (_remRAF) { cancelAnimationFrame(_remRAF); _remRAF = null; }
  }
  function wireReminder() {
    var map = $id('map-el');
    if (!map || map._srWired) return;
    map._srWired = true;
    map.addEventListener('mouseenter', showReminder);
    map.addEventListener('mouseleave', hideReminder);
    map.addEventListener('touchstart', showReminder, { passive: true });
    map.addEventListener('touchend', hideReminder);
    map.addEventListener('touchcancel', hideReminder);
  }

  // Fahren = sofortiger Sprung
  function driveTo(arrow) {
    if (NAV.locked || !arrow) return;
    var target = locById(arrow.id);
    if (!target) return;
    NAV.locked = true; // gegen Doppel-Trigger beim Preload
    var ov = $id('nav-arrows'); if (ov) ov.classList.add('nav-locked');

    var oldYaw = (typeof S !== 'undefined') ? S.panoAngle : 0;
    var targetYaw = oldYaw + angleDiff(oldYaw, arrow.bearing); // auf Fahrtrichtung drehen

    preload(target.id).then(function () {
      buildStrip(target.id);
      if (typeof S !== 'undefined') { S.panoZoom = 1; S.panoVOff = 0; S.panoAngle = targetYaw; }
      if (typeof updatePanoZoom === 'function') updatePanoZoom();
      if (typeof updatePano === 'function') updatePano();
      finishDrive(target);
    });
  }

  function finishDrive(target) {
    NAV.viewId = target.id;
    NAV.arrows = computeNeighbors(target);
    renderArrows();
    NAV.locked = false;
    var ov = $id('nav-arrows'); if (ov) ov.classList.remove('nav-locked');
    updateReturnBtn();
  }

  // Rundenstart
  function onPanoShown(loc) {
    if (!loc) return;
    NAV.locked = false;
    NAV.viewId = loc.id;
    NAV.startId = loc.id;          // zu ratende Position
    setReminderImages(loc.id);
    hideReminder(); wireReminder();
    var ov = $id('nav-arrows'); if (ov) ov.classList.remove('nav-locked');
    updateReturnBtn();             // am Start, also Button weg
    NAV.arrows = computeNeighbors(loc);
    // warten bis der Strip Maße hat, dann Pfeile rendern
    var tries = 0;
    (function waitStrip() {
      var strip = $id('pano-strip');
      if (strip && strip.scrollWidth > 0) { renderArrows(); return; }
      if (tries++ < 40) setTimeout(waitStrip, 60);
    })();
  }

  // loadPano = Rundenstart, updatePano = Pfeile neu positionieren
  function installHooks() {
    if (typeof loadPano === 'function' && !loadPano._navWrapped) {
      var _origLoad = loadPano;
      loadPano = function (loc) { _origLoad(loc); onPanoShown(loc); };
      loadPano._navWrapped = true;
    }
    if (typeof updatePano === 'function' && !updatePano._navWrapped) {
      var _origUpd = updatePano;
      updatePano = function () { _origUpd(); positionArrows(); };
      updatePano._navWrapped = true;
    }
  }
  installHooks();

  // Tastatur: ↑/W vorwärts, ↓/S rückwärts
  document.addEventListener('keydown', function (e) {
    if (NAV.locked || !gameActive()) return;
    var tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    var k = e.key;
    var fwd = (k === 'ArrowUp' || k === 'w' || k === 'W');
    var bwd = (k === 'ArrowDown' || k === 's' || k === 'S');
    if (!fwd && !bwd) return;
    if (!NAV.arrows.length) return;
    var cb = centerBearing();
    var arrow = fwd ? nearestArrow(cb, 90) : nearestArrow(cb + 180, 90);
    if (arrow) { e.preventDefault(); driveTo(arrow); }
  });

  // Resize
  window.addEventListener('resize', positionArrows);

  // bei Hot-Reload mitten in der Runde: aktuelles Pano übernehmen
  document.addEventListener('DOMContentLoaded', function () {
    ensureOverlay();
    if (typeof S !== 'undefined' && S.current && gameActive()) onPanoShown(S.current);
  });
})();
