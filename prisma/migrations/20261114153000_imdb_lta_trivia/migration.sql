-- CreateEnum
CREATE TYPE "ImdbLtaTriviaStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLVED', 'ABANDONED');

-- CreateTable
CREATE TABLE "ImdbLtaTriviaGame" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "movieId" INTEGER NOT NULL,
    "status" "ImdbLtaTriviaStatus" NOT NULL DEFAULT 'DRAFT',
    "backdropPath" TEXT NOT NULL,
    "focusX" DOUBLE PRECISION NOT NULL,
    "focusY" DOUBLE PRECISION NOT NULL,
    "imageStep" INTEGER NOT NULL DEFAULT 0,
    "clueStep" INTEGER NOT NULL DEFAULT 0,
    "clues" JSONB NOT NULL,
    "rootMessageId" INTEGER,
    "winnerUserId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ImdbLtaTriviaGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImdbLtaTriviaGame_number_key" ON "ImdbLtaTriviaGame"("number");

-- CreateIndex
CREATE INDEX "ImdbLtaTriviaGame_status_idx" ON "ImdbLtaTriviaGame"("status");

-- CreateIndex
CREATE INDEX "ImdbLtaTriviaGame_movieId_idx" ON "ImdbLtaTriviaGame"("movieId");

-- CreateIndex
CREATE INDEX "ImdbLtaTriviaGame_winnerUserId_idx" ON "ImdbLtaTriviaGame"("winnerUserId");

-- CreateIndex
CREATE INDEX "ImdbLtaTriviaGame_createdById_idx" ON "ImdbLtaTriviaGame"("createdById");

-- At most one unfinished trivia game (DRAFT or ACTIVE) at a time
CREATE UNIQUE INDEX "ImdbLtaTriviaGame_one_open_idx"
ON "ImdbLtaTriviaGame"((1))
WHERE "status" IN ('DRAFT', 'ACTIVE');

-- AddForeignKey
ALTER TABLE "ImdbLtaTriviaGame" ADD CONSTRAINT "ImdbLtaTriviaGame_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImdbLtaTriviaGame" ADD CONSTRAINT "ImdbLtaTriviaGame_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImdbLtaTriviaGame" ADD CONSTRAINT "ImdbLtaTriviaGame_winnerUserId_fkey" FOREIGN KEY ("winnerUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
