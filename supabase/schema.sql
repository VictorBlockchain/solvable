-- Supabase schema for GoBit contract state and events
-- Postgres-compatible SQL

-- Enums
create type game_status as enum ('none','pending','active','verification_pending','solved','archived');
create type puzzle_type as enum ('riddle','math','other');
create type submission_status as enum ('pending','approved','rejected');

-- Contract-level configuration (single row)
create table if not exists contract_config (
  id smallint primary key default 1,
  house_address text not null,
  house_cut_percentage integer not null default 500,
  vote_threshold_default integer not null default 5,
  challenge_threshold integer not null default 3,
  challenge_fee numeric(78,0) not null default 10000000000000000,
  oracle_verification_timeout_seconds integer not null default 86400,
  updated_at timestamptz not null default now()
);

-- Games mirror: mapping(uint256 => Game)
create table if not exists games (
  id bigint primary key, -- maps to on-chain gameId
  puzzle text not null,
  solution_hash text, -- hex string for keccak256
  status game_status not null default 'pending',
  pot numeric(78,0) not null default 0,
  entry_fee numeric(78,0) not null,
  token_address text, -- null means native
  proposer_address text not null,
  winner_address text,
  vote_threshold integer not null default 5,
  challenge_threshold integer not null default 3,
  puzzle_type puzzle_type not null,
  require_submission_fee boolean not null default true,
  exists boolean not null default true,
  first_solver_address text,
  oracle_params text,
  verification_deadline timestamptz,
  -- Derived counts to match proposalApprovals/Disapprovals
  proposal_approvals integer not null default 0,
  proposal_disapprovals integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_games_status on games(status);
create index if not exists idx_games_proposer on games(proposer_address);
create index if not exists idx_games_winner on games(winner_address);

-- Votes: mapping(uint256 => mapping(address => bool)) + approve/disapprove choice
create table if not exists game_votes (
  id uuid primary key default gen_random_uuid(),
  game_id bigint not null references games(id) on delete cascade,
  voter_address text not null,
  approve boolean not null,
  created_at timestamptz not null default now(),
  unique (game_id, voter_address)
);

create index if not exists idx_votes_game on game_votes(game_id);

-- Submissions: mapping(uint256 => mapping(address => string)), pending until oracle verification for Math
create table if not exists game_submissions (
  id uuid primary key default gen_random_uuid(),
  game_id bigint not null references games(id) on delete cascade,
  submitter_address text not null,
  solution text not null,
  status submission_status not null default 'pending',
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  unique (game_id, submitter_address)
);

create index if not exists idx_submissions_game on game_submissions(game_id);
create index if not exists idx_submissions_status on game_submissions(status);

-- Challenges: mapping(uint256 => mapping(address => bool)) + reasons
create table if not exists game_challenges (
  id uuid primary key default gen_random_uuid(),
  game_id bigint not null references games(id) on delete cascade,
  challenger_address text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (game_id, challenger_address)
);

create index if not exists idx_challenges_game on game_challenges(game_id);

-- Donations: event DonationReceived
create table if not exists game_donations (
  id uuid primary key default gen_random_uuid(),
  game_id bigint not null references games(id) on delete cascade,
  donor_address text not null,
  amount numeric(78,0) not null,
  token_address text, -- null means native
  created_at timestamptz not null default now()
);

create index if not exists idx_donations_game on game_donations(game_id);
create index if not exists idx_donations_donor on game_donations(donor_address);

-- Finalizations: event GameFinalized; archives game and pays out
create table if not exists game_finalizations (
  id uuid primary key default gen_random_uuid(),
  game_id bigint not null unique references games(id) on delete cascade,
  winner_address text not null,
  payout_amount numeric(78,0) not null,
  finalized_at timestamptz not null default now()
);

-- Past winners mapping; redundant but provided for quick lookups
create table if not exists past_winners (
  game_id bigint primary key references games(id) on delete cascade,
  winner_address text not null
);

-- Emergency withdraw tracking (requested/executed)
create table if not exists emergency_withdraws (
  request_id bigint primary key,
  game_id bigint not null references games(id) on delete cascade,
  amount numeric(78,0) not null,
  requested_at timestamptz not null default now(),
  executed_at timestamptz
);

-- Simple triggers to keep games.updated_at fresh
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger games_set_updated_at
before update on games
for each row
execute procedure set_updated_at();

-- Views
-- Active games for UI pagination (Pending excluded)
create or replace view active_games as
select g.*
from games g
where g.status in ('active','verification_pending');

-- Leaderboard: wins per address + total donated
create or replace view leaderboard as
with wins as (
  select winner_address as address, count(*) as wins
  from games
  where status = 'archived' and winner_address is not null
  group by winner_address
),
donations as (
  select donor_address as address, sum(amount) as total_donated
  from game_donations
  group by donor_address
)
select coalesce(w.address, d.address) as address,
       coalesce(w.wins, 0) as wins,
       coalesce(d.total_donated, 0) as total_donated
from wins w
full outer join donations d on w.address = d.address
order by wins desc, total_donated desc;

-- Helper: ensure initial config row exists
insert into contract_config (id, house_address)
select 1, '0x0000000000000000000000000000000000000000'
where not exists (select 1 from contract_config where id = 1);