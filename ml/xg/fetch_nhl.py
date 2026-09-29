"""Download NHL play-by-play for regular-season games of one season (polite: ~1 req/s)."""
import json, os, sys, time, urllib.request

season = int(sys.argv[1]) if len(sys.argv) > 1 else 2025  # start year
n = int(sys.argv[2]) if len(sys.argv) > 2 else 600
out = f"data/nhl-{season}"
os.makedirs(out, exist_ok=True)
for i in range(1, n + 1):
    gid = f"{season}02{i:04d}"
    path = f"{out}/{gid}.json"
    if os.path.exists(path):
        continue
    try:
        req = urllib.request.Request(
            f"https://api-web.nhle.com/v1/gamecenter/{gid}/play-by-play",
            headers={"User-Agent": "HokejHub/0.1 (personal)"},
        )
        with urllib.request.urlopen(req, timeout=20) as r:
            open(path, "wb").write(r.read())
    except Exception as e:
        print(gid, e)
    time.sleep(1)
print("done")
