-- CreateEnum
CREATE TYPE "FindingType" AS ENUM ('SAST', 'SCA');

-- CreateEnum
CREATE TYPE "Classification" AS ENUM ('P1', 'P2', 'P3', 'P4', 'P5');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'FIXED', 'IGNORED');

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "type" "FindingType" NOT NULL,
    "repository" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "commit" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "status" "FindingStatus" NOT NULL,
    "author" TEXT NOT NULL,
    "classification" "Classification" NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "updatedAtSource" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Finding_externalId_key" ON "Finding"("externalId");

-- CreateIndex
CREATE INDEX "Finding_repository_idx" ON "Finding"("repository");

-- CreateIndex
CREATE INDEX "Finding_type_idx" ON "Finding"("type");

-- CreateIndex
CREATE INDEX "Finding_status_idx" ON "Finding"("status");

-- CreateIndex
CREATE INDEX "Finding_classification_idx" ON "Finding"("classification");
