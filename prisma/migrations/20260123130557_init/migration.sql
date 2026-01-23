-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('BIRTHDAY', 'ANNIVERSARY', 'DISCORD', 'IN_PERSON', 'OTHER');

-- CreateEnum
CREATE TYPE "YearTopPickType" AS ENUM ('TOP_10', 'BEST_SEEN', 'WORST_3');

-- CreateTable
CREATE TABLE "List" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "letterboxdUrl" TEXT NOT NULL,
    "imgUrl" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT NOT NULL,
    "originalLanguage" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "letterboxdUrl" TEXT NOT NULL,
    "imdbId" TEXT NOT NULL,
    "posterUrl" TEXT NOT NULL,
    "tmdbId" INTEGER,
    "mamTotalPicks" INTEGER NOT NULL DEFAULT 0,
    "mamTotalPoints" INTEGER NOT NULL DEFAULT 0,
    "mamAverageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mamRank" INTEGER,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieList" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "listId" INTEGER NOT NULL,

    CONSTRAINT "MovieList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT,
    "banned" BOOLEAN,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "time" TIMESTAMP(3),
    "year" INTEGER,
    "type" "EventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

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
    "isSpecialMention" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MamPick_pkey" PRIMARY KEY ("id")
);

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "BoardPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YearTopParticipant" (
    "id" SERIAL NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YearTopParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YearTopPick" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "movieId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "pickType" "YearTopPickType" NOT NULL,
    "isTopPosition" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YearTopPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YearTopMovieStats" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "pickType" "YearTopPickType" NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "YearTopMovieStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OscarEdition" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "ceremonyDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resultsReleased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OscarEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OscarCategory" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "winnerId" INTEGER,

    CONSTRAINT "OscarCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OscarNominee" (
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
CREATE TABLE "OscarBallot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "editionId" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER,

    CONSTRAINT "OscarBallot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OscarPick" (
    "id" SERIAL NOT NULL,
    "ballotId" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "nomineeId" INTEGER NOT NULL,

    CONSTRAINT "OscarPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tmdbId" INTEGER,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieGenre" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "genreId" INTEGER NOT NULL,

    CONSTRAINT "MovieGenre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Director" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tmdbId" INTEGER,

    CONSTRAINT "Director_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieDirector" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "directorId" INTEGER NOT NULL,

    CONSTRAINT "MovieDirector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_imdbId_key" ON "Movie"("imdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");

-- CreateIndex
CREATE INDEX "Movie_mamTotalPoints_mamTotalPicks_idx" ON "Movie"("mamTotalPoints" DESC, "mamTotalPicks" DESC);

-- CreateIndex
CREATE INDEX "Movie_mamRank_idx" ON "Movie"("mamRank");

-- CreateIndex
CREATE INDEX "Movie_tmdbId_idx" ON "Movie"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieList_movieId_listId_key" ON "MovieList"("movieId", "listId");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

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
CREATE INDEX "MamPick_isSpecialMention_idx" ON "MamPick"("isSpecialMention");

-- CreateIndex
CREATE UNIQUE INDEX "MamPick_participantId_movieId_key" ON "MamPick"("participantId", "movieId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRecommendation_date_key" ON "DailyRecommendation"("date");

-- CreateIndex
CREATE INDEX "DailyRecommendation_date_idx" ON "DailyRecommendation"("date");

-- CreateIndex
CREATE INDEX "BoardPost_order_idx" ON "BoardPost"("order");

-- CreateIndex
CREATE UNIQUE INDEX "YearTopParticipant_slug_key" ON "YearTopParticipant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "YearTopParticipant_userId_key" ON "YearTopParticipant"("userId");

-- CreateIndex
CREATE INDEX "YearTopParticipant_displayName_idx" ON "YearTopParticipant"("displayName");

-- CreateIndex
CREATE INDEX "YearTopPick_movieId_idx" ON "YearTopPick"("movieId");

-- CreateIndex
CREATE INDEX "YearTopPick_participantId_idx" ON "YearTopPick"("participantId");

-- CreateIndex
CREATE INDEX "YearTopPick_year_pickType_idx" ON "YearTopPick"("year", "pickType");

-- CreateIndex
CREATE UNIQUE INDEX "YearTopPick_participantId_movieId_year_pickType_key" ON "YearTopPick"("participantId", "movieId", "year", "pickType");

-- CreateIndex
CREATE INDEX "YearTopMovieStats_year_pickType_totalPoints_idx" ON "YearTopMovieStats"("year", "pickType", "totalPoints");

-- CreateIndex
CREATE INDEX "YearTopMovieStats_movieId_idx" ON "YearTopMovieStats"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "YearTopMovieStats_movieId_year_pickType_key" ON "YearTopMovieStats"("movieId", "year", "pickType");

-- CreateIndex
CREATE UNIQUE INDEX "OscarEdition_year_key" ON "OscarEdition"("year");

-- CreateIndex
CREATE INDEX "OscarCategory_editionId_order_idx" ON "OscarCategory"("editionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "OscarCategory_editionId_slug_key" ON "OscarCategory"("editionId", "slug");

-- CreateIndex
CREATE INDEX "OscarNominee_categoryId_idx" ON "OscarNominee"("categoryId");

-- CreateIndex
CREATE INDEX "OscarNominee_movieId_idx" ON "OscarNominee"("movieId");

-- CreateIndex
CREATE INDEX "OscarBallot_editionId_score_idx" ON "OscarBallot"("editionId", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "OscarBallot_userId_editionId_key" ON "OscarBallot"("userId", "editionId");

-- CreateIndex
CREATE INDEX "OscarPick_nomineeId_idx" ON "OscarPick"("nomineeId");

-- CreateIndex
CREATE UNIQUE INDEX "OscarPick_ballotId_categoryId_key" ON "OscarPick"("ballotId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE INDEX "Genre_name_idx" ON "Genre"("name");

-- CreateIndex
CREATE INDEX "MovieGenre_movieId_idx" ON "MovieGenre"("movieId");

-- CreateIndex
CREATE INDEX "MovieGenre_genreId_idx" ON "MovieGenre"("genreId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieGenre_movieId_genreId_key" ON "MovieGenre"("movieId", "genreId");

-- CreateIndex
CREATE UNIQUE INDEX "Director_name_key" ON "Director"("name");

-- CreateIndex
CREATE INDEX "Director_name_idx" ON "Director"("name");

-- CreateIndex
CREATE INDEX "MovieDirector_movieId_idx" ON "MovieDirector"("movieId");

-- CreateIndex
CREATE INDEX "MovieDirector_directorId_idx" ON "MovieDirector"("directorId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieDirector_movieId_directorId_key" ON "MovieDirector"("movieId", "directorId");

-- AddForeignKey
ALTER TABLE "MovieList" ADD CONSTRAINT "MovieList_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieList" ADD CONSTRAINT "MovieList_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MamParticipant" ADD CONSTRAINT "MamParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MamPick" ADD CONSTRAINT "MamPick_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MamParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MamPick" ADD CONSTRAINT "MamPick_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyRecommendation" ADD CONSTRAINT "DailyRecommendation_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyRecommendation" ADD CONSTRAINT "DailyRecommendation_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyRecommendation" ADD CONSTRAINT "DailyRecommendation_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MamParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardPost" ADD CONSTRAINT "BoardPost_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearTopParticipant" ADD CONSTRAINT "YearTopParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearTopPick" ADD CONSTRAINT "YearTopPick_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "YearTopParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearTopPick" ADD CONSTRAINT "YearTopPick_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearTopMovieStats" ADD CONSTRAINT "YearTopMovieStats_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OscarCategory" ADD CONSTRAINT "OscarCategory_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "OscarEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OscarNominee" ADD CONSTRAINT "OscarNominee_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "OscarCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OscarNominee" ADD CONSTRAINT "OscarNominee_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OscarBallot" ADD CONSTRAINT "OscarBallot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OscarBallot" ADD CONSTRAINT "OscarBallot_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "OscarEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OscarPick" ADD CONSTRAINT "OscarPick_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "OscarBallot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OscarPick" ADD CONSTRAINT "OscarPick_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "OscarCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OscarPick" ADD CONSTRAINT "OscarPick_nomineeId_fkey" FOREIGN KEY ("nomineeId") REFERENCES "OscarNominee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieGenre" ADD CONSTRAINT "MovieGenre_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieGenre" ADD CONSTRAINT "MovieGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieDirector" ADD CONSTRAINT "MovieDirector_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieDirector" ADD CONSTRAINT "MovieDirector_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "Director"("id") ON DELETE CASCADE ON UPDATE CASCADE;
