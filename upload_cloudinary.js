#!/usr/bin/env node
/*
 * Cloudinary-Uploader für WelsGuessr-Panoramabilder.
 * Lädt alle WelsGuessr/images/*.jpg nach Cloudinary in den Ordner "welsguessr/".
 * Liefert die Originale aus (KEINE Transformationen → keine Transformations-Credits).
 *
 * RESÜMIERBAR: Jede erfolgreich hochgeladene Datei wird in .cloudinary-uploaded.log
 * vermerkt. Bei Abbruch einfach erneut starten – bereits hochgeladene Dateien werden
 * übersprungen (es werden KEINE Bytes erneut gesendet).
 *
 * ───────────────────────── SETUP (einmalig) ─────────────────────────
 *  1) Auf cloudinary.com KOSTENLOS registrieren  (KEINE Kreditkarte nötig).
 *  2) Dashboard → "Product Environment Credentials": Cloud Name, API Key, API Secret.
 *  3) Im Terminal (im Ordner WelsGuessr):
 *        npm install cloudinary
 *        export CLOUDINARY_URL='cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>'
 *        node upload_cloudinary.js
 *  4) Den <CLOUD_NAME> außerdem in script.js bei  CLOUDINARY_CLOUD='...'  eintragen.
 * ─────────────────────────────────────────────────────────────────────
 */
'use strict';
const fs = require('fs');
const path = require('path');

let cloudinary;
try { cloudinary = require('cloudinary').v2; }
catch (e) { console.error('Fehlt: das Paket "cloudinary". Bitte zuerst:  npm install cloudinary'); process.exit(1); }

const IMAGES_DIR = path.join(__dirname, 'images');
const FOLDER = 'welsguessr';                                   // muss zu IMG_BASE in script.js passen
const LEDGER = path.join(__dirname, '.cloudinary-uploaded.log');
const CONCURRENCY = parseInt(process.env.CLOUD_CONCURRENCY || '16', 10);  // parallele Uploads (per Env überschreibbar)
const MAX_RETRIES = 4;                                          // Wiederholungen bei Netzfehler

if (!process.env.CLOUDINARY_URL) {
  console.error('FEHLER: Umgebungsvariable CLOUDINARY_URL ist nicht gesetzt.\n' +
    "Beispiel:  export CLOUDINARY_URL='cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>'");
  process.exit(1);
}
cloudinary.config({ secure: true });   // liest CLOUDINARY_URL automatisch

if (!fs.existsSync(IMAGES_DIR)) { console.error('Kein images/-Ordner gefunden:', IMAGES_DIR); process.exit(1); }

// Ledger laden (bereits erledigte Dateien)
const done = new Set();
if (fs.existsSync(LEDGER)) {
  fs.readFileSync(LEDGER, 'utf8').split('\n').forEach(l => { l = l.trim(); if (l) done.add(l); });
}
const ledger = fs.createWriteStream(LEDGER, { flags: 'a' });

const allFiles = fs.readdirSync(IMAGES_DIR).filter(f => f.toLowerCase().endsWith('.jpg'));
const total = allFiles.length;
const alreadyDone = allFiles.filter(f => done.has(f)).length;
const todo = allFiles.filter(f => !done.has(f));

// Größe der verbleibenden Dateien für MB-Anzeige (schnell, nur statSync)
let todoBytes = 0;
for (const f of todo) { try { todoBytes += fs.statSync(path.join(IMAGES_DIR, f)).size; } catch (e) {} }

console.log(`${total} Bilder gesamt · ${alreadyDone} bereits hochgeladen · ${todo.length} verbleibend (${fmtMB(todoBytes)}).`);
if (!todo.length) { console.log('Nichts zu tun – alles hochgeladen.'); process.exit(0); }

let cursor = 0, ok = 0, fail = 0, sentBytes = 0;
const failed = [];
const t0 = Date.now();
const isTTY = process.stdout.isTTY;

function fmtMB(b) { return (b / 1048576).toFixed(b >= 1048576 * 100 ? 0 : 1) + ' MB'; }
function fmtETA(sec) {
  if (!isFinite(sec) || sec < 0) return '–';
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + 'h ' : '') + (h || m ? m + 'm ' : '') + s + 's';
}

let lastRender = 0;
function render(force) {
  const now = Date.now();
  if (!force && now - lastRender < 200) return;   // höchstens ~5×/s neu zeichnen
  lastRender = now;
  const finished = alreadyDone + ok;
  const pct = (finished / total * 100);
  const elapsed = (now - t0) / 1000;
  const rate = ok / Math.max(elapsed, 0.001);              // Dateien/s in DIESEM Lauf
  const eta = rate > 0 ? (todo.length - ok) / rate : Infinity;
  const mbps = sentBytes / Math.max(elapsed, 0.001) / 1048576;
  const bar = makeBar(pct);
  const line = `${bar} ${pct.toFixed(1)}%  ${finished}/${total}  ·  ${rate.toFixed(1)}/s (${mbps.toFixed(2)} MB/s)  ·  ETA ${fmtETA(eta)}  ·  ✓${ok} ✗${fail}`;
  if (isTTY) { process.stdout.write('\r' + line + '   '); }
  else { console.log(line); }                              // Fallback wenn in Datei umgeleitet
}
function makeBar(pct) {
  const w = 24, fillN = Math.round(pct / 100 * w);
  return '[' + '█'.repeat(fillN) + '░'.repeat(w - fillN) + ']';
}

function uploadOne(file) {
  const publicId = FOLDER + '/' + file.replace(/\.jpe?g$/i, '');   // ohne Endung; Endung kommt aus der URL
  const full = path.join(IMAGES_DIR, file);
  let size = 0; try { size = fs.statSync(full).size; } catch (e) {}
  return new Promise(resolve => {
    let attempt = 0;
    (function go() {
      attempt++;
      cloudinary.uploader.upload(full, {
        public_id: publicId,
        use_filename: false,
        unique_filename: false,
        overwrite: false,
        resource_type: 'image',
        invalidate: false
      }, (err) => {
        if (err) {
          if (attempt <= MAX_RETRIES) return setTimeout(go, 400 * attempt * attempt); // Backoff
          fail++; failed.push(file); render(true);
          resolve();
          return;
        }
        ok++; sentBytes += size; ledger.write(file + '\n'); render();
        resolve();
      });
    })();
  });
}

async function worker() { while (cursor < todo.length) { await uploadOne(todo[cursor++]); } }

(async () => {
  render(true);
  const ticker = isTTY ? setInterval(() => render(true), 1000) : null;  // ETA läuft auch ohne neue Uploads weiter
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (ticker) clearInterval(ticker);
  ledger.end();
  render(true);
  process.stdout.write('\n');
  console.log(`Fertig in ${fmtETA((Date.now() - t0) / 1000)} · Erfolgreich: ${ok} · Fehlgeschlagen: ${fail}.`);
  if (failed.length) {
    console.log(`${failed.length} fehlgeschlagen – Script einfach erneut starten, um nur diese zu wiederholen.`);
    process.exit(2);
  }
  console.log('Alle Bilder sind auf Cloudinary. Jetzt committen/pushen (siehe Anleitung).');
})();
