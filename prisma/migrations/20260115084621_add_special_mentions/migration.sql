-- AlterTable
ALTER TABLE "MamPick" ADD COLUMN     "isSpecialMention" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "MamPick_isSpecialMention_idx" ON "MamPick"("isSpecialMention");
