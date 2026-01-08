-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "mamAverageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "mamTotalPicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mamTotalPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Movie_mamAverageScore_mamTotalPicks_idx" ON "Movie"("mamAverageScore" DESC, "mamTotalPicks" DESC);
