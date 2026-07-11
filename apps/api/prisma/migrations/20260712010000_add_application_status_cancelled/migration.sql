-- AlterEnum
-- Clients can now cancel their own custom requests (индивидуальные заявки).
ALTER TYPE "ApplicationStatus" ADD VALUE 'CANCELLED';
