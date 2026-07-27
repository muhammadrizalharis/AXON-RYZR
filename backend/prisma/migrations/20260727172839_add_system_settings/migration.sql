-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "defaultUserCredits" INTEGER NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

