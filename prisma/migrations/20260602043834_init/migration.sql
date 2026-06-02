-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "livestreamUrl" TEXT,
ADD COLUMN     "registrationType" "RegistrationType" NOT NULL DEFAULT 'SOLO',
ADD COLUMN     "streamPlatform" "StreamPlatform",
ADD COLUMN     "teamSize" INTEGER;
