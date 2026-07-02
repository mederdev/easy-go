-- CreateEnum
CREATE TYPE "CarType" AS ENUM ('SEDAN', 'MINIVAN', 'BUS');

-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "type" "CarType" NOT NULL DEFAULT 'MINIVAN';

-- AlterTable
ALTER TABLE "CustomRequest" ADD COLUMN     "carType" "CarType",
ADD COLUMN     "wholeCabin" BOOLEAN NOT NULL DEFAULT false;
