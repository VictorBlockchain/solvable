-- Migration to fix gameId size issue
-- Change games.id from bigint to numeric to handle large on-chain gameIds

-- First, drop dependent views
DROP VIEW IF EXISTS active_games;
DROP VIEW IF EXISTS leaderboard;

-- Drop dependent objects
DROP INDEX IF EXISTS idx_games_status;
DROP INDEX IF EXISTS idx_games_proposer;
DROP INDEX IF EXISTS idx_games_winner;

-- Drop foreign key constraints temporarily
ALTER TABLE game_votes DROP CONSTRAINT IF EXISTS game_votes_game_id_fkey;
ALTER TABLE game_submissions DROP CONSTRAINT IF EXISTS game_submissions_game_id_fkey;
ALTER TABLE game_challenges DROP CONSTRAINT IF EXISTS game_challenges_game_id_fkey;
ALTER TABLE game_donations DROP CONSTRAINT IF EXISTS game_donations_game_id_fkey;
ALTER TABLE game_finalizations DROP CONSTRAINT IF EXISTS game_finalizations_game_id_fkey;
ALTER TABLE past_winners DROP CONSTRAINT IF EXISTS past_winners_game_id_fkey;
ALTER TABLE emergency_withdraws DROP CONSTRAINT IF EXISTS emergency_withdraws_game_id_fkey;

-- Change the primary key column type
ALTER TABLE games ALTER COLUMN id TYPE NUMERIC(78,0);

-- Update all referencing tables to use NUMERIC as well
ALTER TABLE game_votes ALTER COLUMN game_id TYPE NUMERIC(78,0);
ALTER TABLE game_submissions ALTER COLUMN game_id TYPE NUMERIC(78,0);
ALTER TABLE game_challenges ALTER COLUMN game_id TYPE NUMERIC(78,0);
ALTER TABLE game_donations ALTER COLUMN game_id TYPE NUMERIC(78,0);
ALTER TABLE game_finalizations ALTER COLUMN game_id TYPE NUMERIC(78,0);
ALTER TABLE past_winners ALTER COLUMN game_id TYPE NUMERIC(78,0);
ALTER TABLE emergency_withdraws ALTER COLUMN game_id TYPE NUMERIC(78,0);

-- Recreate foreign key constraints
ALTER TABLE game_votes ADD CONSTRAINT game_votes_game_id_fkey 
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
ALTER TABLE game_submissions ADD CONSTRAINT game_submissions_game_id_fkey 
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
ALTER TABLE game_challenges ADD CONSTRAINT game_challenges_game_id_fkey 
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
ALTER TABLE game_donations ADD CONSTRAINT game_donations_game_id_fkey 
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
ALTER TABLE game_finalizations ADD CONSTRAINT game_finalizations_game_id_fkey 
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
ALTER TABLE past_winners ADD CONSTRAINT past_winners_game_id_fkey 
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
ALTER TABLE emergency_withdraws ADD CONSTRAINT emergency_withdraws_game_id_fkey 
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;

-- Recreate indexes
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_proposer ON games(proposer_address);
CREATE INDEX idx_games_winner ON games(winner_address);

-- Recreate views
CREATE OR REPLACE VIEW active_games AS
SELECT g.*
FROM games g
WHERE g.status IN ('active','verification_pending');

CREATE OR REPLACE VIEW leaderboard AS
WITH wins AS (
  SELECT winner_address AS address, count(*) AS wins
  FROM games
  WHERE status = 'archived' AND winner_address IS NOT NULL
  GROUP BY winner_address
),
donations AS (
  SELECT donor_address AS address, sum(amount) AS total_donated
  FROM game_donations
  GROUP BY donor_address
)
SELECT coalesce(w.address, d.address) AS address,
       coalesce(w.wins, 0) AS wins,
       coalesce(d.total_donated, 0) AS total_donated
FROM wins w
FULL OUTER JOIN donations d ON w.address = d.address
ORDER BY wins DESC, total_donated DESC;