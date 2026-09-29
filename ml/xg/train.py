"""Fit the xG logistic regression used by packages/core/src/model/xg.ts.

Features must match `xgFeatures()` in xg.ts exactly. Training data: NHL play-by-play
(unblocked attempts: shot-on-goal, missed-shot, goal; shootouts excluded).
"""
import glob, json, math, sys
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss, roc_auc_score

GOAL_X = 89
UNBLOCKED = {"shot-on-goal", "missed-shot", "goal"}

def mmss(s):
    m, x = s.split(":")
    return int(m) * 60 + int(x)

def features(x, y, since_prev, strength):
    dx = GOAL_X - x
    dy = abs(y)
    dist = math.hypot(dx, dy)
    if dx <= 0:
        angle = 90 + math.degrees(math.atan2(-dx, max(dy, 0.1)))
    else:
        angle = math.degrees(math.atan2(dy, dx))
    return [
        dist,
        math.log(dist + 1),
        angle,
        1 if since_prev is not None and since_prev <= 3 else 0,
        1 if strength == "PP" else 0,
        1 if strength == "SH" else 0,
        1 if strength == "EN" else 0,
    ]

NAMES = ["distance", "logDistance", "angle", "rebound", "pp", "sh", "en"]

def rows(path):
    d = json.load(open(path))
    home = d["homeTeam"]["id"]
    last = {}
    for p in d.get("plays", []):
        pd = p["periodDescriptor"]
        if pd.get("periodType") == "SO" or p["typeDescKey"] not in UNBLOCKED:
            continue
        det = p.get("details") or {}
        x, y, owner = det.get("xCoord"), det.get("yCoord"), det.get("eventOwnerTeamId")
        if x is None or y is None or owner is None:
            continue
        is_home = owner == home
        side = p.get("homeTeamDefendingSide")
        if side in ("left", "right"):
            home_attacks_right = side == "left"
            flip = (not home_attacks_right) if is_home else home_attacks_right
        else:
            flip = (det.get("zoneCode") == "O" and x < 0) or (det.get("zoneCode") == "D" and x > 0)
        if flip:
            x, y = -x, -y
        t = (pd["number"] - 1) * 1200 + mmss(p["timeInPeriod"])
        since = t - last[owner] if owner in last else None
        last[owner] = t
        sc = p.get("situationCode") or "1551"
        away_g, away_s, home_s, home_g = int(sc[0]), int(sc[1]), int(sc[2]), int(sc[3])
        own_s, opp_s = (home_s, away_s) if is_home else (away_s, home_s)
        opp_g = away_g if is_home else home_g
        strength = "EN" if opp_g == 0 else "PP" if own_s > opp_s else "SH" if own_s < opp_s else "EV"
        yield features(x, y, since, strength), 1 if p["typeDescKey"] == "goal" else 0, d["id"]

X, Y, G = [], [], []
for f in sorted(glob.glob(sys.argv[1] if len(sys.argv) > 1 else "data/nhl-*/*.json")):
    for fx, label, gid in rows(f):
        X.append(fx); Y.append(label); G.append(gid)
X, Y, G = np.array(X), np.array(Y), np.array(G)
games = np.unique(G)
test_games = set(games[::5])
test = np.array([g in test_games for g in G])
print(f"shots={len(Y)} goals={Y.sum()} ({Y.mean():.3%}) games={len(games)}")

model = LogisticRegression(C=100, max_iter=5000)
model.fit(X[~test], Y[~test])
p = model.predict_proba(X[test])[:, 1]
print(f"holdout AUC={roc_auc_score(Y[test], p):.3f} logloss={log_loss(Y[test], p):.4f} base={log_loss(Y[test], np.full(len(p), Y[~test].mean())):.4f}")
print(f"holdout sum xG={p.sum():.1f} vs goals={Y[test].sum()}")

model.fit(X, Y)
out = {
    "intercept": float(model.intercept_[0]),
    "weights": {n: float(w) for n, w in zip(NAMES, model.coef_[0])},
    "trainedOn": f"NHL play-by-play, {len(games)} games, {len(Y)} unblocked attempts",
}
json.dump(out, open("../../packages/core/src/model/xg-coefficients.json", "w"), indent=2)
print(json.dumps(out, indent=2))
