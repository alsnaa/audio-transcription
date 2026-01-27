import { unlink } from 'fs/promises';
import prisma from '../services/db.js';
import { transcribe } from '../services/transcriptions.js';

export default async (payload, helpers) => {
  const { jobId, chunkIndex, chunkPath, totalChunks } = payload;

  helpers.logger.info(
    `Starting transcription for job ${jobId}, chunk ${chunkIndex + 1}/${totalChunks}`
  );

  try {
    // Send chunk to Whisper API
    const response = await transcribe(chunkPath);
    const text = response.text || '';

    helpers.logger.info(
      `Transcription complete for job ${jobId}, chunk ${chunkIndex + 1}/${totalChunks}`
    );

    // Save result to TranscriptionResult table
    await prisma.transcriptionResult.create({
      data: {
        jobId,
        chunkIndex,
        text,
      },
    });

    // Check if all chunks are done
    const completedCount = await prisma.transcriptionResult.count({
      where: { jobId },
    });

    const job = await prisma.job.findUnique({ where: { id: jobId } });

    // Clean up chunk file (skip if chunk is the preprocessed file itself)
    if (chunkPath !== job.processedFilePath) {
      await unlink(chunkPath);
      helpers.logger.info(`Deleted chunk file: ${chunkPath}`);
    }

    // All chunks transcribed — mark job as completed and clean up
    if (completedCount === totalChunks) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'COMPLETED' },
      });

      if (job.processedFilePath) {
        await unlink(job.processedFilePath).catch(() => {});
      }

      helpers.logger.info(`Job ${jobId} fully transcribed (${totalChunks} chunks).`);
    }
  } catch (error) {
    helpers.logger.error(
      `Transcription failed for job ${jobId}, chunk ${chunkIndex + 1}/${totalChunks}: ${error.message}`
    );

    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
};
