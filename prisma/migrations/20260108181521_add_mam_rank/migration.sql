-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "mamRank" INTEGER;

-- CreateIndex
CREATE INDEX "Movie_mamRank_idx" ON "Movie"("mamRank");
