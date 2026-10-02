-- A corrected final score (or decision: regulation / overtime / shootout) also marks the game
-- dirty, so the crawl refresh rewrites the Elo snapshot even when no box-score row changed.
drop trigger if exists game_stats_dirty on game;
create trigger game_stats_dirty after update on game
  for each row
  when (old.status is distinct from new.status or old.phase is distinct from new.phase
        or old.season_id is distinct from new.season_id or old.league_id is distinct from new.league_id
        or old.home_score is distinct from new.home_score or old.away_score is distinct from new.away_score
        or old.decided_in is distinct from new.decided_in)
  execute function mark_stats_dirty_game();
