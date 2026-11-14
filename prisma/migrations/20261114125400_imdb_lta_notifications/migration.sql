-- CreateTable
CREATE TABLE "ImdbLtaNotification" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImdbLtaNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImdbLtaNotification_key_key" ON "ImdbLtaNotification"("key");
