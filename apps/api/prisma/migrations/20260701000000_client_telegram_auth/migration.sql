-- Telegram Login Widget: customers can sign up without a phone.
-- Phone becomes nullable (still unique when present); add Telegram identity fields.
ALTER TABLE "Client" ALTER COLUMN "phone" DROP NOT NULL;

ALTER TABLE "Client" ADD COLUMN "telegramId" TEXT;
ALTER TABLE "Client" ADD COLUMN "telegramUsername" TEXT;
ALTER TABLE "Client" ADD COLUMN "photoUrl" TEXT;

CREATE UNIQUE INDEX "Client_telegramId_key" ON "Client"("telegramId");
