-- AlterTable
ALTER TABLE "ImdbLtaTriviaGame" ADD COLUMN "hostUserId" TEXT;

-- CreateIndex
CREATE INDEX "ImdbLtaTriviaGame_hostUserId_idx" ON "ImdbLtaTriviaGame"("hostUserId");

-- AddForeignKey
ALTER TABLE "ImdbLtaTriviaGame" ADD CONSTRAINT "ImdbLtaTriviaGame_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
