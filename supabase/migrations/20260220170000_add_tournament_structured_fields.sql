ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS prize_pool text,
  ADD COLUMN IF NOT EXISTS team_size text,
  ADD COLUMN IF NOT EXISTS entry_fee text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS contact_info text;
