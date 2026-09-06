-- CreateEnum
CREATE TYPE "ImdbLtaPhase" AS ENUM ('NOMINATION_OPEN', 'NOMINATION_CLOSED', 'RATING_OPEN', 'RATING_CLOSED');

-- CreateTable
CREATE TABLE "ImdbLtaConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "phase" "ImdbLtaPhase" NOT NULL DEFAULT 'NOMINATION_OPEN',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImdbLtaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImdbLtaNominationList" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImdbLtaNominationList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImdbLtaNomination" (
    "id" SERIAL NOT NULL,
    "listId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImdbLtaNomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImdbLtaRating" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImdbLtaRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImdbLtaNominationList_userId_key" ON "ImdbLtaNominationList"("userId");

-- CreateIndex
CREATE INDEX "ImdbLtaNomination_movieId_idx" ON "ImdbLtaNomination"("movieId");

-- CreateIndex
CREATE INDEX "ImdbLtaNomination_listId_idx" ON "ImdbLtaNomination"("listId");

-- CreateIndex
CREATE INDEX "ImdbLtaNomination_userId_idx" ON "ImdbLtaNomination"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ImdbLtaNomination_userId_movieId_key" ON "ImdbLtaNomination"("userId", "movieId");

-- CreateIndex
CREATE INDEX "ImdbLtaRating_movieId_idx" ON "ImdbLtaRating"("movieId");

-- CreateIndex
CREATE INDEX "ImdbLtaRating_userId_idx" ON "ImdbLtaRating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ImdbLtaRating_userId_movieId_key" ON "ImdbLtaRating"("userId", "movieId");

-- AddForeignKey
ALTER TABLE "ImdbLtaNominationList" ADD CONSTRAINT "ImdbLtaNominationList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImdbLtaNomination" ADD CONSTRAINT "ImdbLtaNomination_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ImdbLtaNominationList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImdbLtaNomination" ADD CONSTRAINT "ImdbLtaNomination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImdbLtaNomination" ADD CONSTRAINT "ImdbLtaNomination_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImdbLtaRating" ADD CONSTRAINT "ImdbLtaRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImdbLtaRating" ADD CONSTRAINT "ImdbLtaRating_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed singleton config row (NOMINATION_OPEN)
INSERT INTO "ImdbLtaConfig" ("id", "phase", "updatedAt")
VALUES (1, 'NOMINATION_OPEN', CURRENT_TIMESTAMP);
