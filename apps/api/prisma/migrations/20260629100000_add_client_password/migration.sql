-- Add optional password fields to Client for phone+password login
ALTER TABLE "Client" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "Client" ADD COLUMN "passwordRaw" TEXT;
