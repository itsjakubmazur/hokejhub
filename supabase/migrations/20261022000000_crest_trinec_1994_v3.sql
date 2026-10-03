-- HC Železárny Třinec: a cleaner redraw after the club puck, supplied by the user.
update team_season_logo set logo_url = '/crests/trinec-1994-v3.png'
where team_id = 'hcz-11' and league_id = 'cz-elh' and season between 1994 and 1998;
