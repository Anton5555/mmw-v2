/*
  Warnings:

  - You are about to drop the column `monthDay` on the `event` table. All the data in the column will be lost.
  - Added the required column `day` to the `event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `month` to the `event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "event" DROP COLUMN "monthDay",
ADD COLUMN     "day" INTEGER NOT NULL,
ADD COLUMN     "month" INTEGER NOT NULL,
ADD COLUMN     "time" TIMESTAMP(3);
