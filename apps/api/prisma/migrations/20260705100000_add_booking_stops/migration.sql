-- CreateEnum
CREATE TYPE "StopKind" AS ENUM ('PICKUP', 'DROPOFF');

-- CreateTable
CREATE TABLE "BookingStop" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" "StopKind" NOT NULL DEFAULT 'PICKUP',
    "address" TEXT NOT NULL,
    "note" TEXT,
    "price" INTEGER,
    "pickedUp" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingStop_bookingId_idx" ON "BookingStop"("bookingId");

-- AddForeignKey
ALTER TABLE "BookingStop" ADD CONSTRAINT "BookingStop_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "CustomRequest" ADD COLUMN "stops" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN "stopPriceCity" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "stopPriceOutside" INTEGER NOT NULL DEFAULT 0;
