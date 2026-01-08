-- CreateTable
CREATE TABLE "MamParticipant" (
    "id" SERIAL NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MamParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MamPick" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "movieId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MamPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MamParticipant_slug_key" ON "MamParticipant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MamParticipant_userId_key" ON "MamParticipant"("userId");

-- CreateIndex
CREATE INDEX "MamParticipant_displayName_idx" ON "MamParticipant"("displayName");

-- CreateIndex
CREATE INDEX "MamPick_movieId_idx" ON "MamPick"("movieId");

-- CreateIndex
CREATE INDEX "MamPick_participantId_idx" ON "MamPick"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "MamPick_participantId_movieId_key" ON "MamPick"("participantId", "movieId");

-- AddForeignKey
ALTER TABLE "MamParticipant" ADD CONSTRAINT "MamParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MamPick" ADD CONSTRAINT "MamPick_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MamParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MamPick" ADD CONSTRAINT "MamPick_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
