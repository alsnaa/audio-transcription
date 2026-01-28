/*
  Warnings:

  - You are about to drop the column `chunkPaths` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `fileName` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `processedFilePath` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the `TranscriptionResult` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[fileId]` on the table `Job` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fileId` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TranscriptionResult" DROP CONSTRAINT "TranscriptionResult_jobId_fkey";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "chunkPaths",
DROP COLUMN "fileName",
DROP COLUMN "filePath",
DROP COLUMN "processedFilePath",
ADD COLUMN     "completedChunks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fileId" TEXT NOT NULL,
ADD COLUMN     "totalChunks" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "TranscriptionResult";

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "processedFilePath" TEXT,
    "chunkPaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" TEXT,
    "duration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "start" DOUBLE PRECISION NOT NULL,
    "end" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_fileId_key" ON "Job"("fileId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
