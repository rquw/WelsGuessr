import requests
import os
import math
import json
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

API_KEY = "AIzaSyB9axCTZ50X6U2oiuI6Pfwq_FOHZRYhuf4"

BASE_DIR = os.path.expanduser("~/Desktop/TernberGuessr")
OUTPUT_DIR = os.path.join(BASE_DIR, "images")
META_DIR = os.path.join(BASE_DIR, "metadata")
LOG_FILE = os.path.join(BASE_DIR, "log.json")
DATA_JS_FILE = os.path.join(BASE_DIR, "data.js")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(META_DIR, exist_ok=True)

LAT_MIN = 47.937113
LAT_MAX = 47.959307
LON_MIN = 14.347893
LON_MAX = 14.367190

GRID_SPACING_METERS = 12.0
HEADINGS = [0, 90, 180, 270]
MAX_RETRIES = 5
METADATA_RADIUS = 5
IMAGE_SIZE = "640x640"
FOV = 90
PITCH = 0
WORKERS = 16
REQUEST_TIMEOUT_METADATA = 10
REQUEST_TIMEOUT_IMAGE = 20
LOG_SAVE_EVERY = 10

session = requests.Session()
adapter = requests.adapters.HTTPAdapter(pool_connections=WORKERS * 2, pool_maxsize=WORKERS * 2)
session.mount("http://", adapter)
session.mount("https://", adapter)

lock = threading.Lock()

def request_with_retry(url, params, timeout=15):
    delay = 0.75
    for _ in range(MAX_RETRIES):
        try:
            r = session.get(url, params=params, timeout=timeout)
            if r.status_code in (429, 500, 502, 503, 504):
                time.sleep(delay)
                delay = min(delay * 2, 20)
                continue
            return r
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError):
            time.sleep(delay)
            delay = min(delay * 2, 20)
    return None

def check_panorama(lat, lon):
    r = request_with_retry(
        "https://maps.googleapis.com/maps/api/streetview/metadata",
        {
            "location": f"{lat},{lon}",
            "radius": METADATA_RADIUS,
            "key": API_KEY
        },
        timeout=REQUEST_TIMEOUT_METADATA
    )
    if r is None:
        return False, {}
    try:
        data = r.json()
    except Exception:
        return False, {}
    return data.get("status") == "OK", data

def download_image(pano_id, heading):
    fname = f"{pano_id}_h{heading:03d}.jpg"
    fpath = os.path.join(OUTPUT_DIR, fname)

    if os.path.exists(fpath):
        return False

    r = request_with_retry(
        "https://maps.googleapis.com/maps/api/streetview",
        {
            "size": IMAGE_SIZE,
            "pano": pano_id,
            "heading": heading,
            "fov": FOV,
            "pitch": PITCH,
            "key": API_KEY
        },
        timeout=REQUEST_TIMEOUT_IMAGE
    )
    if r is None:
        return False

    if r.status_code == 200 and r.headers.get("content-type", "").startswith("image"):
        with open(fpath, "wb") as f:
            f.write(r.content)
        return True

    return False

def save_meta(pano_id, meta):
    meta_path = os.path.join(META_DIR, f"{pano_id}.json")
    if not os.path.exists(meta_path):
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

def save_data_js(entries):
    locations = [{"id": entry["pano_id"], "lat": entry["lat"], "lng": entry["lon"]} for entry in entries]
    content = "const LOCATIONS = " + json.dumps(locations, separators=(",", ":")) + ";"
    with open(DATA_JS_FILE, "w", encoding="utf-8") as f:
        f.write(content)

def build_grid():
    lat_step = GRID_SPACING_METERS / 111320.0
    center_lat = (LAT_MIN + LAT_MAX) / 2
    lon_step = GRID_SPACING_METERS / (111320.0 * math.cos(math.radians(center_lat)))

    lats = []
    lat = LAT_MIN
    while lat <= LAT_MAX:
        lats.append(round(lat, 7))
        lat += lat_step

    lons = []
    lon = LON_MIN
    while lon <= LON_MAX:
        lons.append(round(lon, 7))
        lon += lon_step

    points = []
    for lat in lats:
        for lon in lons:
            points.append((lat, lon))
    return points

if os.path.exists(LOG_FILE):
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        log = json.load(f)
else:
    log = []

seen_panos = {entry["pano_id"] for entry in log}
save_data_js(log)

points = build_grid()
total = len(points)

print(f"Grid points: {total}", flush=True)
print(f"Output: {OUTPUT_DIR}", flush=True)
print(f"Already known panos: {len(seen_panos)}", flush=True)

checked_count = 0
new_panos_count = 0
new_images_count = 0
pending_log_writes = 0

def process_point(lat, lon):
    ok, meta = check_panorama(lat, lon)
    if not ok:
        return {
            "checked": 1,
            "new_pano": 0,
            "new_images": 0,
            "log_entry": None
        }

    pano_id = meta.get("pano_id")
    if not pano_id:
        return {
            "checked": 1,
            "new_pano": 0,
            "new_images": 0,
            "log_entry": None
        }

    real_location = meta.get("location", {})
    real_lat = real_location.get("lat", lat)
    real_lon = real_location.get("lng", lon)

    with lock:
        if pano_id in seen_panos:
            return {
                "checked": 1,
                "new_pano": 0,
                "new_images": 0,
                "log_entry": None
            }
        seen_panos.add(pano_id)

    images_added = 0
    for heading in HEADINGS:
        if download_image(pano_id, heading):
            images_added += 1

    save_meta(pano_id, meta)

    return {
        "checked": 1,
        "new_pano": 1,
        "new_images": images_added,
        "log_entry": {
            "pano_id": pano_id,
            "lat": real_lat,
            "lon": real_lon
        }
    }

with ThreadPoolExecutor(max_workers=WORKERS) as executor:
    futures = [executor.submit(process_point, lat, lon) for lat, lon in points]

    for i, future in enumerate(as_completed(futures), 1):
        try:
            result = future.result()
        except Exception as e:
            print(f"[Error] {e}", flush=True)
            continue

        checked_count += result["checked"]
        new_panos_count += result["new_pano"]
        new_images_count += result["new_images"]

        if result["log_entry"] is not None:
            with lock:
                log.append(result["log_entry"])
                pending_log_writes += 1

                if pending_log_writes >= LOG_SAVE_EVERY:
                    with open(LOG_FILE, "w", encoding="utf-8") as f:
                        json.dump(log, f, indent=2)
                    save_data_js(log)
                    pending_log_writes = 0

        if i % 100 == 0 or i == total:
            print(
                f"[{i}/{total}] checked={checked_count} new_panos={new_panos_count} new_images={new_images_count} total_known={len(seen_panos)}",
                flush=True
            )

with open(LOG_FILE, "w", encoding="utf-8") as f:
    json.dump(log, f, indent=2)

save_data_js(log)

print("=== FERTIG ===", flush=True)
print(f"Punkte gecheckt: {checked_count}", flush=True)
print(f"Neue Panoramas gefunden: {new_panos_count}", flush=True)
print(f"Neue Bilder gespeichert: {new_images_count}", flush=True)
print(f"Panoramas gesamt im Log: {len(seen_panos)}", flush=True)
print(f"data.js aktualisiert: {DATA_JS_FILE}", flush=True)