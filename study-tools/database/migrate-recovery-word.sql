-- Recovery word: optional self-service recovery path so students who lose their
-- session don't always need the teacher to read out their UUID.
--
-- Purely additive: one nullable column. Existing students unaffected; they get
-- a retroactive prompt to set one on their next visit. The existing UUID-paste
-- and name+period flows continue to work forever.
--
-- Storage is a SHA-256 hex hash of the lowercased trimmed word. Not a security
-- boundary (the UUID isn't either), just basic hygiene so a leaked DB dump
-- doesn't reveal the literal words.

ALTER TABLE students ADD COLUMN IF NOT EXISTS recovery_word_hash text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS recovery_word_set_at timestamp;
