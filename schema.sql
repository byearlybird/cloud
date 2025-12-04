-- SQLite Schema for Cloud Storage API
-- Designed to replace the generic KV store with a proper relational schema

-- =============================================================================
-- USERS TABLE
-- Stores user authentication information
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                    -- UUID v4
  email TEXT NOT NULL UNIQUE,              -- User's email (used for login)
  hashed_password TEXT NOT NULL,           -- Bcrypt hashed password
  encrypted_master_key TEXT NOT NULL,      -- Client-side encrypted master key
  created_at TEXT NOT NULL                 -- ISO 8601 datetime string
);

-- Index for fast email lookups during signin
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- =============================================================================
-- REFRESH_TOKENS TABLE
-- Stores revoked refresh tokens for security
-- Only revoked tokens are stored; absence means token is valid
-- =============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,                     -- Auto-generated UUID
  user_id TEXT NOT NULL,                   -- Reference to users.id
  token_hash TEXT NOT NULL,                -- Bun.hash() of the JWT token
  revoked_at TEXT NOT NULL,                -- ISO 8601 datetime when token was revoked

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Composite index for fast token validation lookups
-- Query pattern: WHERE user_id = ? AND token_hash = ?
CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_user_hash
  ON refresh_tokens(user_id, token_hash);


-- =============================================================================
-- DOCUMENTS TABLE
-- Stores user documents in JSON:API format
-- The document_data column contains the full JsonDocument<AnyObject> structure
-- =============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,                     -- Auto-generated UUID
  user_id TEXT NOT NULL,                   -- Reference to users.id
  document_key TEXT NOT NULL,              -- Document identifier (e.g., "settings", "notes")
  document_data TEXT NOT NULL,             -- JSON serialized JsonDocument<AnyObject>

  -- Composite unique constraint: one document per user per key
  UNIQUE(user_id, document_key),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Composite index for fast document retrieval
-- Query pattern: WHERE user_id = ? AND document_key = ?
CREATE INDEX IF NOT EXISTS idx_documents_user_key
  ON documents(user_id, document_key);


-- =============================================================================
-- NOTES ON DOCUMENT STRUCTURE
-- =============================================================================
-- The document_data column stores a JSON:API formatted document with this structure:
--
-- {
--   "jsonapi": { "version": "1.1" },
--   "meta": { "latest": "<eventstamp>" },
--   "data": [
--     {
--       "type": "<resource-type>",
--       "id": "<resource-id>",
--       "attributes": { <arbitrary nested object> },
--       "meta": {
--         "eventstamps": { "<path>": "<eventstamp>", ... },
--         "latest": "<eventstamp>",
--         "deletedAt": "<eventstamp>" | null
--       }
--     },
--     ...
--   ]
-- }
--
-- This format is defined by @byearlybird/starling and supports:
-- - Conflict-free merging via eventstamps
-- - Soft deletion tracking
-- - Nested attribute structures
-- - Multiple resource objects per document


-- =============================================================================
-- MIGRATION FROM KV STORE
-- =============================================================================
-- Current KV key patterns to table mappings:
--
-- 1. ["auth", email] → users table
--    - Key becomes email column
--    - Value contains: id, email, hashedPassword, encryptedMasterKey, createdAt
--
-- 2. ["token", userId, tokenHash] → refresh_tokens table
--    - userId → user_id column
--    - tokenHash → token_hash column
--    - Value contains: revokedAt
--
-- 3. ["document", userId, documentKey] → documents table
--    - userId → user_id column
--    - documentKey → document_key column
--    - Value contains: full JsonDocument object (stored as TEXT)


-- =============================================================================
-- PERFORMANCE CONSIDERATIONS
-- =============================================================================
-- 1. WAL mode should be enabled: PRAGMA journal_mode = WAL;
-- 2. All foreign keys should have ON DELETE CASCADE for data integrity
-- 3. Indexes are designed for actual query patterns used in the services
-- 4. UUIDs are stored as TEXT (36 chars) which is fine for SQLite
-- 5. JSON is stored as TEXT - SQLite's JSON functions can be used if needed later
