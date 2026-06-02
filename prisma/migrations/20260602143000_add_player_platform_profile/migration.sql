ALTER TABLE "User" ADD COLUMN "platformId" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "User" ADD COLUMN "defaultGame" "GameTitle";
ALTER TABLE "User" ADD COLUMN "defaultGamePlayerId" TEXT;
CREATE UNIQUE INDEX "User_platformId_key" ON "User"("platformId");
