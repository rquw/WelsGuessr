#!/usr/bin/env bash
# ============================================================
#  WelsGuessr — Panorama-Bilder zu GitHub (für jsDelivr-CDN)
#  Lädt WelsGuessr/images/*.jpg in das öffentliche Repo
#  rquw/welsguessr-images und liefert sie danach gratis &
#  OHNE Bandbreitenlimit über jsDelivr aus.
#
#  In BATCHES gepusht  → kein 408-Timeout (anders als ein 3,4-GB-Push).
#  Nutzt ein SEPARATES Git-Verzeichnis → der WelsGuessr-Ordner
#  und dessen .git bleiben komplett unberührt.
#  RESÜMIERBAR: bei Abbruch einfach erneut starten.
#
#  SETUP (einmalig):
#   1) Repo anlegen (öffentlich!):  gh repo create rquw/welsguessr-images --public
#      (oder auf github.com → New repository → Name: welsguessr-images, Public)
#   2) Im Ordner WelsGuessr:   bash push_images_jsdelivr.sh
# ============================================================
set -eu
REPO_URL="https://github.com/rquw/welsguessr-images.git"
BATCH=1500
HERE="$(cd "$(dirname "$0")" && pwd)"
IMG="$HERE/images"
export GIT_DIR="$HERE/../.welsguessr-images.git"     # liegt NEBEN WelsGuessr, nicht darin
export GIT_WORK_TREE="$IMG"

[ -d "$IMG" ] || { echo "FEHLER: Kein images/-Ordner gefunden: $IMG"; exit 1; }

if [ ! -d "$GIT_DIR" ]; then
  git init -q -b main
  git remote add origin "$REPO_URL"
fi
git config gc.auto 0

cd "$IMG"
LIST="$(mktemp)"; find . -maxdepth 1 -type f -name '*.jpg' | sed 's|^\./||' > "$LIST"
total=$(wc -l < "$LIST" | tr -d ' ')
echo "$total Bilder. Pushe in Batches von $BATCH …"
start=1; n=0
while [ "$start" -le "$total" ]; do
  end=$((start + BATCH - 1)); [ "$end" -gt "$total" ] && end=$total
  sed -n "${start},${end}p" "$LIST" | tr '\n' '\0' | xargs -0 git add --
  if ! git diff --cached --quiet; then
    git commit -q -m "images $n"
    git push -q -u origin main || git push -q origin main || true
    echo "  $end/$total gepusht"
  fi
  start=$((end + 1)); n=$((n + 1))
done
git push -q origin main || true   # eventuelle Reste flushen
rm -f "$LIST"
echo
echo "Fertig! Bilder werden ausgeliefert über:"
echo "  https://cdn.jsdelivr.net/gh/rquw/welsguessr-images@main/<id>_h000.jpg"
echo "Passt zu IMG_BASE in script.js. Jetzt WelsGuessr committen/pushen."
