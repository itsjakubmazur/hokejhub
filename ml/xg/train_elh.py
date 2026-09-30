"""Fit the extraliga xG model on hokej.cz shot data.

hokej.cz publishes every shot with coordinates in percent of the half-rink (x: 0..100 from the
centre line towards the attacked end, y: -100..100 across), already normalised so the home team
attacks +x and visitors -x. Czech rinks are 60 x 30 m, so the goal line sits 26 m from centre.

Usage:
  CRON_SECRET=... python ml/xg/train_elh.py download 2016 2026   # export + raw shot files
  python ml/xg/train_elh.py fit                                   # fit, evaluate, write JSON
Data lands in data/elh (gitignored).
"""
import json, math, os, sys, time, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "elh"
SHOTS = DATA / "shots"
OUT = ROOT / "packages" / "core" / "src" / "model" / "xg-elh-coefficients.json"
API = "https://hokejhub.vercel.app/api/admin/export/xg"
S3 = "https://s3-eu-west-1.amazonaws.com/hokej.cz/visualization/shots/{}.json"

HALF_LEN_M, HALF_WID_M, GOAL_X_M = 30.0, 15.0, 26.0
RESULT = {1: "saved", 2: "missed", 3: "blocked", 4: "goal"}


def get(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": "HokejHub-xG/1.0 (personal)", **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def download(first, last):
    """Exports come from our API; raw shot files straight from hokej.cz's public S3 bucket."""
    from concurrent.futures import ThreadPoolExecutor

    SHOTS.mkdir(parents=True, exist_ok=True)
    secret = os.environ["CRON_SECRET"]

    def fetch(gid):
        f = SHOTS / f"{gid}.json"
        if f.exists():
            return True
        try:
            f.write_text(json.dumps(get(S3.format(gid))))
            return True
        except Exception:  # 404 (no shot data), resets, timeouts
            return False

    for season in range(first, last + 1):
        exp = DATA / f"export-{season}.json"
        if not exp.exists():
            exp.write_text(json.dumps(get(f"{API}?season={season}", {"Authorization": f"Bearer {secret}"})))
        games = json.loads(exp.read_text())["games"]
        with ThreadPoolExecutor(max_workers=8) as pool:
            ok = sum(pool.map(fetch, [g["id"] for g in games]))
        print(f"{season}: {len(games)} games, shots for {ok}", flush=True)


def features(xp, yp, rebound, pp, sh):
    """xp/yp in hokej.cz percent units → geometry in metres relative to the net."""
    x = xp / 100 * HALF_LEN_M
    y = yp / 100 * HALF_WID_M
    dx = GOAL_X_M - x
    dy = abs(y)
    dist = math.hypot(dx, dy)
    angle = 90 + math.degrees(math.atan2(-dx, max(dy, 0.05))) if dx <= 0 else math.degrees(math.atan2(dy, dx))
    return [dist, math.log(dist + 1), angle, dist * angle / 100, rebound, pp, sh]


NAMES = ["distance", "logDistance", "angle", "distAngle", "rebound", "pp", "sh"]


def manpower(t, penalties, goals):
    """Skaters on ice (home, away) at elapsed second t from minors/majors; a PP goal ends one minor."""
    active = []  # [end, is_home, minor]
    for p in penalties:
        m = p.get("min") or 0
        if m not in (2, 4, 5):
            continue
        active.append([p["e"] + m * 60, p["home"], m != 5, p["e"]])
    # PP goals release the earliest-ending minor of the shorthanded side.
    for g in sorted(goals, key=lambda g: g["e"]):
        if g["e"] >= t:
            break
        sit = g.get("sit") or ""
        if "/" in sit:
            a, b = sit.split("/")
            if a.isdigit() and b.isdigit() and int(a) > int(b):
                cands = [p for p in active if p[2] and p[1] != g["home"] and p[3] <= g["e"] < p[0]]
                if cands:
                    min(cands, key=lambda p: p[0])[0] = g["e"]
    h = a = 5
    for end, is_home, _minor, start in active:
        if start <= t < end:
            if is_home:
                h -= 1
            else:
                a -= 1
    return max(h, 3), max(a, 3)


def rows_for(game, raw):
    m = raw["match"]
    home_id = m["home_id"]
    shots = sorted(m.get("shots") or [], key=lambda s: (s["time"], s["id"]))
    last = {}
    out = []
    for s in shots:
        res = RESULT.get(s["match_shot_resutl_id"])
        if not res:
            continue
        is_home = s["team_id"] == home_id
        t = s["time"]
        prev = last.get(is_home)
        last[is_home] = t
        if res == "blocked" or t >= 3900:  # unblocked attempts only, no shootout
            continue
        xp = s["coordinate_x"] if is_home else -s["coordinate_x"]
        yp = s["coordinate_y"] if is_home else -s["coordinate_y"]
        h, a = manpower(t, game["penalties"], game["goals"])
        own, opp = (h, a) if is_home else (a, h)
        rebound = 1 if prev is not None and t - prev <= 3 else 0
        out.append((features(xp, yp, rebound, 1 if own > opp else 0, 1 if own < opp else 0), 1 if res == "goal" else 0, game["id"], is_home))
    return out


def load():
    data = []
    for exp in sorted(DATA.glob("export-*.json")):
        season = int(exp.stem.split("-")[1])
        for g in json.loads(exp.read_text())["games"]:
            f = SHOTS / f"{g['id']}.json"
            if not f.exists():
                continue
            try:
                raw = json.loads(f.read_text())
            except json.JSONDecodeError:
                continue
            for r in rows_for(g, raw):
                data.append((season,) + r)
    return data


def fit():
    import numpy as np
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import log_loss, roc_auc_score

    data = load()
    seasons = sorted({d[0] for d in data})
    test_season = seasons[-2] if len(seasons) > 2 else seasons[-1]  # last complete season held out
    tr = [d for d in data if d[0] != test_season]
    te = [d for d in data if d[0] == test_season]
    X = lambda rows: np.array([r[1] for r in rows])
    Y = lambda rows: np.array([r[2] for r in rows])
    model = LogisticRegression(C=1.0, max_iter=2000)
    model.fit(X(tr), Y(tr))
    p = model.predict_proba(X(te))[:, 1]
    base = np.full_like(p, Y(tr).mean())
    print(f"seasons {seasons}, train {len(tr)} shots, test {len(te)} shots (season {test_season})")
    print(f"goal rate {Y(tr).mean():.4f} | test log loss {log_loss(Y(te), p):.4f} (baseline {log_loss(Y(te), base):.4f}) | AUC {roc_auc_score(Y(te), p):.3f}")
    print(f"test: sum xG {p.sum():.1f} vs goals {Y(te).sum()}")
    bins = np.clip((p * 20).astype(int), 0, 19)
    for b in range(20):
        sel = bins == b
        if sel.sum() >= 50:
            print(f"  xG {b / 20:.2f}-{(b + 1) / 20:.2f}: n={sel.sum():5d} predicted {p[sel].mean():.3f} observed {Y(te)[sel].mean():.3f}")
    # Per-game totals: how well team xG tracks team goals.
    per = {}
    for r, pr in zip(te, p):
        k = (r[3], r[4])
        g = per.setdefault(k, [0.0, 0])
        g[0] += pr
        g[1] += r[2]
    xs = np.array([v[0] for v in per.values()])
    gs = np.array([v[1] for v in per.values()])
    print(f"team-game xG vs goals: corr {np.corrcoef(xs, gs)[0, 1]:.3f}, mean xG {xs.mean():.2f}, mean goals {gs.mean():.2f}")

    final = LogisticRegression(C=1.0, max_iter=2000).fit(X(data), Y(data))
    OUT.write_text(
        json.dumps(
            {
                "intercept": float(final.intercept_[0]),
                "weights": {n: float(w) for n, w in zip(NAMES, final.coef_[0])},
                "geometry": {"halfLengthM": HALF_LEN_M, "halfWidthM": HALF_WID_M, "goalXM": GOAL_X_M, "units": "hokej.cz percent of half-rink"},
                "trainedOn": f"ELH hokej.cz shots, seasons {seasons[0]}-{seasons[-1]}, {len(data)} unblocked attempts",
            },
            indent=2,
        )
        + "\n"
    )
    print("wrote", OUT)


if __name__ == "__main__":
    if sys.argv[1] == "download":
        download(int(sys.argv[2]), int(sys.argv[3]))
    else:
        fit()
