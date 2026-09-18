-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('RECOMMENDED', 'VIEWED', 'SELECTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "tutorRequestId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "factorScores" JSONB NOT NULL,
    "matchReasons" JSONB NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'RECOMMENDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Match_tutorRequestId_tutorId_key" ON "Match"("tutorRequestId", "tutorId");

-- CreateIndex
CREATE INDEX "Match_tutorRequestId_idx" ON "Match"("tutorRequestId");

-- CreateIndex
CREATE INDEX "Match_tutorId_idx" ON "Match"("tutorId");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_score_idx" ON "Match"("score" DESC);

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tutorRequestId_fkey" FOREIGN KEY ("tutorRequestId") REFERENCES "TutorRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;