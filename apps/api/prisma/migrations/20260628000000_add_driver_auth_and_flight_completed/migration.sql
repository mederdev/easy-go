-- Add passwordHash (nullable) to Driver for driver app login
ALTER TABLE "Driver" ADD COLUMN "passwordHash" TEXT;

-- Make Driver.phone unique for login lookup
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_phone_key" UNIQUE ("phone");

-- Add COMPLETED value to FlightStatus enum
ALTER TYPE "FlightStatus" ADD VALUE 'COMPLETED';
