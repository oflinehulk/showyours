CREATE UNIQUE INDEX unique_seed_per_tournament
  ON tournament_registrations (tournament_id, seed)
  WHERE seed IS NOT NULL AND status IN ('approved', 'pending');