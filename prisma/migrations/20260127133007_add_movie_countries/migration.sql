-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieCountry" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "countryId" INTEGER NOT NULL,

    CONSTRAINT "MovieCountry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE INDEX "Country_name_idx" ON "Country"("name");

-- CreateIndex
CREATE INDEX "MovieCountry_movieId_idx" ON "MovieCountry"("movieId");

-- CreateIndex
CREATE INDEX "MovieCountry_countryId_idx" ON "MovieCountry"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieCountry_movieId_countryId_key" ON "MovieCountry"("movieId", "countryId");

-- AddForeignKey
ALTER TABLE "MovieCountry" ADD CONSTRAINT "MovieCountry_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieCountry" ADD CONSTRAINT "MovieCountry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
