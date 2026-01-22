-- DropIndex
DROP INDEX "Movie_mamAverageScore_mamTotalPicks_idx";

-- CreateIndex
CREATE INDEX "Movie_mamTotalPoints_mamTotalPicks_idx" ON "Movie"("mamTotalPoints" DESC, "mamTotalPicks" DESC);
