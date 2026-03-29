-- Extend all expired scheduling tokens by 90 days from now
UPDATE scheduling_tokens
SET expires_at = now() + INTERVAL '90 days'
WHERE expires_at < now();