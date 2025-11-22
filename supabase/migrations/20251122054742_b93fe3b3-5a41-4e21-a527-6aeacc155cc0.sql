-- Enable pgcrypto for Manager PIN approval tokens (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;