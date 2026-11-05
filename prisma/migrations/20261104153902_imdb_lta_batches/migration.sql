-- CreateEnum
CREATE TYPE "ImdbLtaBatchStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable: backfill updatedAt from createdAt for existing ratings
ALTER TABLE "ImdbLtaRating" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "ImdbLtaRating" SET "updatedAt" = "createdAt";
ALTER TABLE "ImdbLtaRating" ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateTable
CREATE TABLE "ImdbLtaBatch" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "ImdbLtaBatchStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "announcedAt" TIMESTAMP(3),

    CONSTRAINT "ImdbLtaBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImdbLtaBatchMovie" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "movieId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ImdbLtaBatchMovie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImdbLtaSkip" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImdbLtaSkip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImdbLtaBatch_number_key" ON "ImdbLtaBatch"("number");

-- CreateIndex
CREATE INDEX "ImdbLtaBatch_status_idx" ON "ImdbLtaBatch"("status");

-- At most one OPEN batch at a time
CREATE UNIQUE INDEX "ImdbLtaBatch_one_open_idx" ON "ImdbLtaBatch"("status") WHERE "status" = 'OPEN';

-- CreateIndex
CREATE INDEX "ImdbLtaBatchMovie_movieId_idx" ON "ImdbLtaBatchMovie"("movieId");

-- CreateIndex
CREATE INDEX "ImdbLtaBatchMovie_batchId_idx" ON "ImdbLtaBatchMovie"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "ImdbLtaBatchMovie_batchId_movieId_key" ON "ImdbLtaBatchMovie"("batchId", "movieId");

-- CreateIndex
CREATE INDEX "ImdbLtaSkip_movieId_idx" ON "ImdbLtaSkip"("movieId");

-- CreateIndex
CREATE INDEX "ImdbLtaSkip_userId_idx" ON "ImdbLtaSkip"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ImdbLtaSkip_userId_movieId_key" ON "ImdbLtaSkip"("userId", "movieId");

-- AddForeignKey
ALTER TABLE "ImdbLtaBatchMovie" ADD CONSTRAINT "ImdbLtaBatchMovie_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImdbLtaBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImdbLtaBatchMovie" ADD CONSTRAINT "ImdbLtaBatchMovie_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImdbLtaSkip" ADD CONSTRAINT "ImdbLtaSkip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImdbLtaSkip" ADD CONSTRAINT "ImdbLtaSkip_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
