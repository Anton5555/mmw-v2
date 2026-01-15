-- CreateTable
CREATE TABLE "DailyRecommendation" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "movieId" INTEGER,
    "listId" INTEGER,
    "participantId" INTEGER,
    "curatorName" TEXT,
    "curatorImage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyRecommendation_date_key" ON "DailyRecommendation"("date");

-- CreateIndex
CREATE INDEX "DailyRecommendation_date_idx" ON "DailyRecommendation"("date");

-- AddForeignKey
ALTER TABLE "DailyRecommendation" ADD CONSTRAINT "DailyRecommendation_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyRecommendation" ADD CONSTRAINT "DailyRecommendation_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyRecommendation" ADD CONSTRAINT "DailyRecommendation_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MamParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
