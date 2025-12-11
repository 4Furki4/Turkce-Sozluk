-- =============================================================================
-- Better-Auth Migration Script (Safe Version)
-- Migrates from AuthJS to better-auth schema
-- Safely checks column existence before making changes
-- =============================================================================

-- STEP 1: Check and rename columns ONLY if old names still exist
-- =============================================================================

-- Accounts table column renames (only if old column exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'accounts' AND column_name = 'provider') THEN
        ALTER TABLE "accounts" RENAME COLUMN "provider" TO "providerId";
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'accounts' AND column_name = 'access_token') THEN
        ALTER TABLE "accounts" RENAME COLUMN "access_token" TO "accessToken";
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'accounts' AND column_name = 'refresh_token') THEN
        ALTER TABLE "accounts" RENAME COLUMN "refresh_token" TO "refreshToken";
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'accounts' AND column_name = 'expires_at') THEN
        ALTER TABLE "accounts" RENAME COLUMN "expires_at" TO "accessTokenExpiresAt";
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'accounts' AND column_name = 'id_token') THEN
        ALTER TABLE "accounts" RENAME COLUMN "id_token" TO "idToken";
    END IF;
END $$;

-- Session table column renames (only if old column exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'session' AND column_name = 'sessionToken') THEN
        ALTER TABLE "session" RENAME COLUMN "sessionToken" TO "token";
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'session' AND column_name = 'expires') THEN
        ALTER TABLE "session" RENAME COLUMN "expires" TO "expiresAt";
    END IF;
END $$;

-- Rename verification_token to verification (only if old table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'verification_token') THEN
        ALTER TABLE "verification_token" RENAME TO "verification";
    END IF;
END $$;

-- Verification table column renames (only if old column exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'verification' AND column_name = 'expires') THEN
        ALTER TABLE "verification" RENAME COLUMN "expires" TO "expiresAt";
    END IF;
END $$;

-- =============================================================================
-- STEP 2: Add new columns (IF NOT EXISTS is safe)
-- =============================================================================

-- Add id column to accounts
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "id" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "accountId" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" timestamp;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "password" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();

-- Add columns to session
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "id" text;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "ipAddress" text;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "userAgent" text;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now();
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "impersonatedBy" text;

-- Add columns to verification
ALTER TABLE "verification" ADD COLUMN IF NOT EXISTS "id" text;
ALTER TABLE "verification" ADD COLUMN IF NOT EXISTS "value" text;
ALTER TABLE "verification" ADD COLUMN IF NOT EXISTS "createdAt" timestamp;
ALTER TABLE "verification" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp;

-- Add columns to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "banned" boolean DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ban_reason" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ban_expires" timestamp;

-- =============================================================================
-- STEP 3: Backfill NULL values with data
-- =============================================================================

-- Generate IDs for accounts rows
UPDATE "accounts" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL OR "id" = '';

-- Set accountId from providerAccountId if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'accounts' AND column_name = 'providerAccountId') THEN
        EXECUTE 'UPDATE "accounts" SET "accountId" = "providerAccountId" WHERE "accountId" IS NULL';
    ELSE
        -- If providerAccountId doesn't exist, generate a UUID
        UPDATE "accounts" SET "accountId" = gen_random_uuid()::text WHERE "accountId" IS NULL;
    END IF;
END $$;

UPDATE "accounts" SET "createdAt" = CURRENT_TIMESTAMP WHERE "createdAt" IS NULL;
UPDATE "accounts" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

-- Generate IDs for session rows from token
UPDATE "session" SET "id" = COALESCE("token", gen_random_uuid()::text) WHERE "id" IS NULL OR "id" = '';
UPDATE "session" SET "createdAt" = CURRENT_TIMESTAMP WHERE "createdAt" IS NULL;
UPDATE "session" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

-- Generate IDs for verification rows
UPDATE "verification" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL OR "id" = '';

-- Copy token to value if token column exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'verification' AND column_name = 'token') THEN
        EXECUTE 'UPDATE "verification" SET "value" = "token" WHERE "value" IS NULL AND "token" IS NOT NULL';
    ELSE
        UPDATE "verification" SET "value" = gen_random_uuid()::text WHERE "value" IS NULL;
    END IF;
END $$;

-- Update users defaults
UPDATE "users" SET "email_verified" = false WHERE "email_verified" IS NULL;
UPDATE "users" SET "created_at" = CURRENT_TIMESTAMP WHERE "created_at" IS NULL;
UPDATE "users" SET "updated_at" = CURRENT_TIMESTAMP WHERE "updated_at" IS NULL;

-- =============================================================================
-- STEP 4: Drop old primary key constraints (safely)
-- =============================================================================

ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_provider_providerAccountId_pk";
ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_pkey";
ALTER TABLE "verification" DROP CONSTRAINT IF EXISTS "verification_token_identifier_token_pk";
ALTER TABLE "verification" DROP CONSTRAINT IF EXISTS "verificationToken_identifier_token_pk";
ALTER TABLE "verification" DROP CONSTRAINT IF EXISTS "verification_pkey";
ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey";

-- =============================================================================
-- STEP 5: Set NOT NULL constraints and add new primary keys
-- =============================================================================

-- Accounts
ALTER TABLE "accounts" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "accounts" ADD PRIMARY KEY ("id");
ALTER TABLE "accounts" ALTER COLUMN "accountId" SET NOT NULL;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'accounts' AND column_name = 'createdAt') THEN
        ALTER TABLE "accounts" ALTER COLUMN "createdAt" SET NOT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'accounts' AND column_name = 'updatedAt') THEN
        ALTER TABLE "accounts" ALTER COLUMN "updatedAt" SET NOT NULL;
    END IF;
END $$;

-- Session
ALTER TABLE "session" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "session" ADD PRIMARY KEY ("id");
ALTER TABLE "session" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "session" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Verification
ALTER TABLE "verification" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "verification" ADD PRIMARY KEY ("id");
ALTER TABLE "verification" ALTER COLUMN "value" SET NOT NULL;

-- =============================================================================
-- STEP 6: Add unique constraint and foreign keys (safely)
-- =============================================================================

-- Add unique constraint on token if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_token_unique') THEN
        ALTER TABLE "session" ADD CONSTRAINT "session_token_unique" UNIQUE("token");
    END IF;
END $$;

-- Add foreign key for impersonatedBy if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_impersonatedBy_users_id_fk') THEN
        ALTER TABLE "session" ADD CONSTRAINT "session_impersonatedBy_users_id_fk" 
            FOREIGN KEY ("impersonatedBy") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

-- =============================================================================
-- STEP 7: Update users table columns
-- =============================================================================

-- Rename emailVerified to emailVerifiedTimestamp if it's the old timestamp column
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'emailVerified' 
               AND data_type = 'timestamp without time zone') THEN
        ALTER TABLE "users" RENAME COLUMN "emailVerified" TO "emailVerifiedTimestamp";
    END IF;
END $$;

-- Update timestamp columns to have timezone (safely)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'created_at' 
               AND data_type = 'timestamp without time zone') THEN
        ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone 
            USING "created_at"::timestamp with time zone;
    END IF;
END $$;

ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();

DO $$ 
BEGIN
    ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'updated_at' 
               AND data_type = 'timestamp without time zone') THEN
        ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone 
            USING "updated_at"::timestamp with time zone;
    END IF;
END $$;

ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();

DO $$ 
BEGIN
    ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Ensure email_verified is not null
ALTER TABLE "users" ALTER COLUMN "email_verified" SET NOT NULL;

-- =============================================================================
-- STEP 8: Drop old columns that are no longer needed (safely)
-- =============================================================================

ALTER TABLE "accounts" DROP COLUMN IF EXISTS "type";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "providerAccountId";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "token_type";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "session_state";
ALTER TABLE "verification" DROP COLUMN IF EXISTS "token";

-- =============================================================================
-- DONE! Your database should now be compatible with better-auth
-- =============================================================================

-- Verification query: Check the final schema
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('accounts', 'session', 'verification', 'users')
ORDER BY table_name, ordinal_position;
