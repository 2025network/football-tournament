INSERT INTO "Achievement" ("id", "name", "description", "icon", "createdAt", "updatedAt")
VALUES
  (concat('ach_', md5('First Match Played')), 'First Match Played', 'Complete your first rated penalty match.', 'PLAY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (concat('ach_', md5('First Win')), 'First Win', 'Win your first rated penalty match.', 'WIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (concat('ach_', md5('3 Wins')), '3 Wins', 'Win 3 rated penalty matches.', '3W', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (concat('ach_', md5('5 Wins')), '5 Wins', 'Win 5 rated penalty matches.', '5W', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (concat('ach_', md5('10 Wins')), '10 Wins', 'Win 10 rated penalty matches.', '10W', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (concat('ach_', md5('Top 10 Player')), 'Top 10 Player', 'Reach the top 10 on a season leaderboard.', 'TOP10', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (concat('ach_', md5('Season Champion')), 'Season Champion', 'Hold the number 1 position in a season leaderboard.', 'CHAMP', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (concat('ach_', md5('Penalty King')), 'Penalty King', 'Score at least 15 goals in rated penalty matches.', 'KING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "icon" = EXCLUDED."icon",
  "updatedAt" = CURRENT_TIMESTAMP;
