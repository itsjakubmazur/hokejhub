-- Re-score every stored extraliga shot with the ELH-trained xG model
-- (packages/core/src/model/xg-elh-coefficients.json, fitted by ml/xg/train_elh.py).
-- Stored shots keep the app convention: x = hokej.cz x (percent of half-rink), y = hokej.cz y * 0.425.

with s as (
  select e.game_id, e.seq, e.situation, e.payload->>'result' as res,
         (e.period - 1) * 1200 + e.period_seconds as t,
         lag((e.period - 1) * 1200 + e.period_seconds) over (partition by e.game_id, e.team_id order by (e.period - 1) * 1200 + e.period_seconds, e.seq) as prev,
         26.0 - e.x / 100.0 * 30.0 as dx,
         abs(e.y / 0.425 / 100.0 * 15.0) as dy
  from game_event e
  join game g on g.id = e.game_id
  where e.type = 'shot' and g.league_id = 'cz-elh' and e.x is not null and e.y is not null
), f as (
  select s.*, sqrt(dx * dx + dy * dy) as dist,
         case when dx <= 0 then 90 + degrees(atan2(-dx, greatest(dy, 0.05))) else degrees(atan2(dy, dx)) end as angle,
         case when prev is not null and t - prev <= 3 then 1 else 0 end as reb
  from s
), z as (
  select game_id, seq, res, t,
         -0.6340346465866953
         + -0.23107690952725163 * dist
         + -0.02932290618739234 * ln(dist + 1)
         + 0.0006874470882620562 * angle
         + -0.10476546629894186 * dist * angle / 100
         + 0.02854868375886008 * reb
         + 0.3655745921592315 * (case when situation = 'PP' then 1 else 0 end)
         + 0.16399365069239077 * (case when situation = 'SH' then 1 else 0 end)
         + -0.2707095999696711 / (dist + 1)
         + -1.0449208842179292 * (angle / 90) * (angle / 90)
         + 0.47054066866352245 * dist * dist / 100
         + 0.49123441043969 * reb * angle / 90 as logit
  from f
)
update game_event e
set xg = case when z.res = 'blocked' or z.t >= 3900 then 0 else round((1 / (1 + exp(-z.logit)))::numeric, 4) end
from z
where e.game_id = z.game_id and e.seq = z.seq;

-- Team xG totals shown on game pages and team/league tables.
update game g
set team_stats = jsonb_set(coalesce(g.team_stats, '{}'::jsonb), '{xG}', jsonb_build_array(round(x.home::numeric, 2), round(x.away::numeric, 2)))
from (
  select e.game_id,
         sum(e.xg) filter (where e.team_id = g2.home_team_id) as home,
         sum(e.xg) filter (where e.team_id = g2.away_team_id) as away
  from game_event e join game g2 on g2.id = e.game_id
  where e.type = 'shot' and g2.league_id = 'cz-elh'
  group by e.game_id
) x
where g.id = x.game_id and g.team_stats ? 'xG';
