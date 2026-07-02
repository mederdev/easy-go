-- Telegram bot integration: back-office users link a Telegram account
-- (deep-link bot login + personal booking notifications).
ALTER TABLE "User" ADD COLUMN "telegramId" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramUsername" TEXT;

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- Group chat that receives booking notifications (captured automatically
-- when the bot is added to the group, or set manually in admin settings).
ALTER TABLE "SystemConfig" ADD COLUMN "telegramNotifyChatId" TEXT;
