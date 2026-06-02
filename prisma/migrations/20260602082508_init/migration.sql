-- CreateEnum
CREATE TYPE "WebsiteSettingType" AS ENUM ('TEXT', 'LONG_TEXT', 'URL', 'IMAGE', 'JSON');

-- CreateTable
CREATE TABLE "WebsiteSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "WebsiteSettingType" NOT NULL DEFAULT 'TEXT',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteSetting_key_key" ON "WebsiteSetting"("key");
