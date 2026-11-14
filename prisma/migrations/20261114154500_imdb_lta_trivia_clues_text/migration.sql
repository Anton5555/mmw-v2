-- Avoid Prisma Json in zod-prisma-types (broken under Prisma 7 custom client output).
ALTER TABLE "ImdbLtaTriviaGame" ALTER COLUMN "clues" SET DATA TYPE TEXT USING "clues"::text;
