-- CreateTable
CREATE TABLE "public"."OscarEdition" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "ceremonyDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resultsReleased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OscarEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OscarCategory" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "winnerId" INTEGER,

    CONSTRAINT "OscarCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OscarNominee" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "filmTitle" TEXT,
    "imdbId" TEXT,
    "filmImdbId" TEXT,
    "movieId" INTEGER,

    CONSTRAINT "OscarNominee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OscarBallot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "editionId" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER,

    CONSTRAINT "OscarBallot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OscarPick" (
    "id" SERIAL NOT NULL,
    "ballotId" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "nomineeId" INTEGER NOT NULL,

    CONSTRAINT "OscarPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OscarEdition_year_key" ON "public"."OscarEdition"("year");

-- CreateIndex
CREATE UNIQUE INDEX "OscarCategory_editionId_slug_key" ON "public"."OscarCategory"("editionId", "slug");

-- CreateIndex
CREATE INDEX "OscarCategory_editionId_order_idx" ON "public"."OscarCategory"("editionId", "order");

-- CreateIndex
CREATE INDEX "OscarNominee_categoryId_idx" ON "public"."OscarNominee"("categoryId");

-- CreateIndex
CREATE INDEX "OscarNominee_movieId_idx" ON "public"."OscarNominee"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "OscarBallot_userId_editionId_key" ON "public"."OscarBallot"("userId", "editionId");

-- CreateIndex
CREATE INDEX "OscarBallot_editionId_score_idx" ON "public"."OscarBallot"("editionId", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "OscarPick_ballotId_categoryId_key" ON "public"."OscarPick"("ballotId", "categoryId");

-- CreateIndex
CREATE INDEX "OscarPick_nomineeId_idx" ON "public"."OscarPick"("nomineeId");

-- AddForeignKey
ALTER TABLE "public"."OscarCategory" ADD CONSTRAINT "OscarCategory_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "public"."OscarEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OscarNominee" ADD CONSTRAINT "OscarNominee_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."OscarCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OscarNominee" ADD CONSTRAINT "OscarNominee_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OscarBallot" ADD CONSTRAINT "OscarBallot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OscarBallot" ADD CONSTRAINT "OscarBallot_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "public"."OscarEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OscarPick" ADD CONSTRAINT "OscarPick_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "public"."OscarBallot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OscarPick" ADD CONSTRAINT "OscarPick_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."OscarCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OscarPick" ADD CONSTRAINT "OscarPick_nomineeId_fkey" FOREIGN KEY ("nomineeId") REFERENCES "public"."OscarNominee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
