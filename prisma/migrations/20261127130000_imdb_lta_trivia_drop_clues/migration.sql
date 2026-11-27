-- Clues are sent by hand now. Old snapshots were TMDB data and can be refetched.
ALTER TABLE "ImdbLtaTriviaGame" DROP COLUMN "clueStep",
DROP COLUMN "clues";
