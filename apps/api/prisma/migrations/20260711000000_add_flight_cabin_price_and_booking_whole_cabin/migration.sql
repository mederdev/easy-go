-- AlterTable
ALTER TABLE "Flight" ADD COLUMN     "cabinPrice" INTEGER;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "wholeCabin" BOOLEAN NOT NULL DEFAULT false;
