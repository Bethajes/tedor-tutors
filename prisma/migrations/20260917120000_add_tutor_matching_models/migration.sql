-- CreateEnum
CREATE TYPE "TeachingMode" AS ENUM ('IN_PERSON', 'ONLINE', 'BOTH');

-- CreateEnum
CREATE TYPE "TutorProfileStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'MATCHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "TutorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TutorProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "bio" TEXT,
    "photoUrl" TEXT,
    "location" TEXT,
    "serviceAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "teachingModes" "TeachingMode"[] NOT NULL DEFAULT ARRAY[]::"TeachingMode"[],
    "hourlyRate" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorSubject" (
    "id" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "academicLevels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorAvailability" (
    "id" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "subjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "academicLevels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "teachingModes" "TeachingMode"[] NOT NULL DEFAULT ARRAY[]::"TeachingMode"[],
    "location" TEXT,
    "serviceArea" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorRequestSchedule" (
    "id" TEXT NOT NULL,
    "tutorRequestId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorRequestSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorProfile_userId_key" ON "TutorProfile"("userId");

-- CreateIndex
CREATE INDEX "TutorProfile_userId_idx" ON "TutorProfile"("userId");

-- CreateIndex
CREATE INDEX "TutorProfile_status_idx" ON "TutorProfile"("status");

-- CreateIndex
CREATE INDEX "TutorSubject_tutorProfileId_idx" ON "TutorSubject"("tutorProfileId");

-- CreateIndex
CREATE INDEX "TutorSubject_subject_idx" ON "TutorSubject"("subject");

-- CreateIndex
CREATE INDEX "TutorAvailability_tutorProfileId_idx" ON "TutorAvailability"("tutorProfileId");

-- CreateIndex
CREATE INDEX "TutorRequest_userId_idx" ON "TutorRequest"("userId");

-- CreateIndex
CREATE INDEX "TutorRequest_status_idx" ON "TutorRequest"("status");

-- CreateIndex
CREATE INDEX "TutorRequestSchedule_tutorRequestId_idx" ON "TutorRequestSchedule"("tutorRequestId");

-- AddForeignKey
ALTER TABLE "TutorProfile" ADD CONSTRAINT "TutorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorSubject" ADD CONSTRAINT "TutorSubject_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorAvailability" ADD CONSTRAINT "TutorAvailability_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorRequest" ADD CONSTRAINT "TutorRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorRequestSchedule" ADD CONSTRAINT "TutorRequestSchedule_tutorRequestId_fkey" FOREIGN KEY ("tutorRequestId") REFERENCES "TutorRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
