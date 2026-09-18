-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TutorOpportunity" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "tutorRequestId" TEXT NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorOpportunity_matchId_key" ON "TutorOpportunity"("matchId");

-- CreateIndex
CREATE INDEX "TutorOpportunity_tutorId_idx" ON "TutorOpportunity"("tutorId");

-- CreateIndex
CREATE INDEX "TutorOpportunity_tutorRequestId_idx" ON "TutorOpportunity"("tutorRequestId");

-- CreateIndex
CREATE INDEX "TutorOpportunity_status_idx" ON "TutorOpportunity"("status");

-- AddForeignKey
ALTER TABLE "TutorOpportunity" ADD CONSTRAINT "TutorOpportunity_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorOpportunity" ADD CONSTRAINT "TutorOpportunity_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorOpportunity" ADD CONSTRAINT "TutorOpportunity_tutorRequestId_fkey" FOREIGN KEY ("tutorRequestId") REFERENCES "TutorRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
