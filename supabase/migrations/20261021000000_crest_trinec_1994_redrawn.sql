-- HC Železárny Třinec: the crest redrawn as a clean vector after the club puck (same layout,
-- colours and ironworks emblem), replacing the cut-out from the photo.
update team_season_logo set logo_url = '/crests/trinec-1994-v2.png'
where team_id = 'hcz-11' and league_id = 'cz-elh' and season between 1994 and 1998;
