-- CreateEnum
CREATE TYPE "CarFeature" AS ENUM ('ROOF_RACK', 'CHILD_SEAT', 'EXTRA_LUGGAGE', 'PET');

-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "features" "CarFeature"[];

-- AlterTable
ALTER TABLE "CustomRequest" ADD COLUMN     "features" "CarFeature"[];
