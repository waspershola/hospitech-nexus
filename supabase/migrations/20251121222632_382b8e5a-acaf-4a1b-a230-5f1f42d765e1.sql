-- Enable pgcrypto extension for gen_random_bytes() function
-- This is required by generate_approval_token RPC and other functions using cryptographic randomness
CREATE EXTENSION IF NOT EXISTS pgcrypto;