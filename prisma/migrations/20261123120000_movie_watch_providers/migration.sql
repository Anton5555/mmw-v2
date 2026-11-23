-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "watchProvidersSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "watchCountry" TEXT;

-- CreateTable
CREATE TABLE "MovieWatchProviders" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "link" TEXT,
    "providers" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieWatchProviders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MovieWatchProviders_movieId_country_key" ON "MovieWatchProviders"("movieId", "country");

-- CreateIndex
CREATE INDEX "Movie_watchProvidersSyncedAt_idx" ON "Movie"("watchProvidersSyncedAt");

-- AddForeignKey
ALTER TABLE "MovieWatchProviders" ADD CONSTRAINT "MovieWatchProviders_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

