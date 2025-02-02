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

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieList" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "listId" INTEGER NOT NULL,

    CONSTRAINT "MovieList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_imdbId_key" ON "Movie"("imdbId");

-- AddForeignKey
ALTER TABLE "MovieList" ADD CONSTRAINT "MovieList_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MovieList" ADD CONSTRAINT "MovieList_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

