/*
  Warnings:

  - You are about to drop the column `chunkResults` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `Job` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Job" DROP COLUMN "chunkResults",
DROP COLUMN "result";

-- CreateTable
CREATE TABLE "TranscriptionResult" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptionResult_jobId_chunkIndex_key" ON "TranscriptionResult"("jobId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "TranscriptionResult" ADD CONSTRAINT "TranscriptionResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
