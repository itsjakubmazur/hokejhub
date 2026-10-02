-- Tips saved while the scoreboard still listed Czech games under neighbouring days carry the
-- wrong play date (an extraliga game of 2 October stored under 1 October). Settlement looked the
-- game up by that date and never found it. Extraliga play dates follow the Prague date of the
-- face-off; NHL keeps its own night-based dates.
update tip_game
set play_date = (start_at at time zone 'Europe/Prague')::date
where league_key = 'cz-elh' and play_date <> (start_at at time zone 'Europe/Prague')::date;
