import path from 'path';
import { unlink } from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import prisma from '../services/db.js';
import { transcribe } from '../services/transcriptions.js';

const DEFAULT_CHUNK_DURATION = 300; // 5 minutes in seconds

async function transcribeChunk(
  {
    jobId,
    fileId,
    chunkIndex,
    chunkPath,
    chunkOffset,
    totalChunks,
    processedFilePath,
    model,
  },
  helpers
) {
  helpers.logger.info(
    `Starting transcription for chunk ${chunkIndex + 1}/${totalChunks}`
  );

  const response = await transcribe(chunkPath, { model });
  const { language, segments = [] } = response;

  helpers.logger.info(
    `Chunk ${chunkIndex + 1}/${totalChunks} transcribed (${segments.length} segments)`
  );

  // Save segments with adjusted timestamps
  if (segments.length > 0) {
    await prisma.segment.createMany({
      data: segments.map((seg) => ({
        fileId,
        start: seg.start + chunkOffset,
        end: seg.end + chunkOffset,
        text: seg.text,
      })),
    });
  }

  // Set detected language on File (idempotent across chunks)
  if (language) {
    await prisma.file.update({
      where: { id: fileId },
      data: { language },
    });
  }

  // Atomically increment completedChunks
  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: { completedChunks: { increment: 1 } },
  });

  // Clean up chunk file (skip if it's the preprocessed file itself)
  if (chunkPath !== processedFilePath) {
    await unlink(chunkPath);
    helpers.logger.info(`Deleted chunk file: ${chunkPath}`);
  }

  // All chunks done — mark job completed and clean up processed file
  if (updatedJob.completedChunks === totalChunks) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'COMPLETED' },
    });

    if (processedFilePath) {
      await unlink(processedFilePath).catch(() => {});
    }

    helpers.logger.info(
      `Job ${jobId} fully transcribed (${totalChunks} chunks).`
    );
  }
}

export default async (payload, helpers) => {
  const { jobId, fileId, model = 'whisper-local', chunkDuration = DEFAULT_CHUNK_DURATION } = payload;

  helpers.logger.info(`Starting chunking for job ${jobId}`);

  const file = await prisma.file.findUnique({ where: { id: fileId } });

  if (!file || !file.processedFilePath) {
    throw new Error(`File ${fileId} not found or not preprocessed`);
  }

  try {
    // Get audio duration via ffprobe
    const duration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(file.processedFilePath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration);
      });
    });

    helpers.logger.info(`Audio duration for job ${jobId}: ${duration}s`);

    // Store total duration on File
    await prisma.file.update({
      where: { id: fileId },
      data: { duration },
    });

    // If audio is shorter than chunk duration, use the file as-is
    if (duration <= chunkDuration) {
      await prisma.file.update({
        where: { id: fileId },
        data: { chunkPaths: [file.processedFilePath] },
      });

      await prisma.job.update({
        where: { id: jobId },
        data: { totalChunks: 1 },
      });

      await transcribeChunk(
        {
          jobId,
          fileId,
          chunkIndex: 0,
          chunkPath: file.processedFilePath,
          chunkOffset: 0,
          totalChunks: 1,
          processedFilePath: file.processedFilePath,
          model,
        },
        helpers
      );

      return;
    }

    // Calculate number of chunks
    const numChunks = Math.ceil(duration / chunkDuration);
    const chunkPaths = [];
    const transcriptionPromises = [];

    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkDuration;
      const chunkPath = path.join(
        'uploads',
        `${fileId}_chunk_${String(i).padStart(3, '0')}.wav`
      );

      // Split this chunk
      await new Promise((resolve, reject) => {
        ffmpeg(file.processedFilePath)
          .seekInput(start)
          .duration(chunkDuration)
          .audioFrequency(16000)
          .audioChannels(1)
          .format('wav')
          .on('end', resolve)
          .on('error', reject)
          .save(chunkPath);
      });

      chunkPaths.push(chunkPath);

      helpers.logger.info(
        `Chunk ${i + 1}/${numChunks} split, sending to transcribe`
      );

      // Fire off transcription immediately — don't wait
      transcriptionPromises.push(
        transcribeChunk(
          {
            jobId,
            fileId,
            chunkIndex: i,
            chunkPath,
            chunkOffset: start,
            totalChunks: numChunks,
            processedFilePath: file.processedFilePath,
            model,
          },
          helpers
        ).catch((err) => {
          helpers.logger.error(
            `Transcription failed for chunk ${i + 1}/${numChunks}: ${err.message}`
          );
          throw err;
        })
      );
    }

    await prisma.file.update({
      where: { id: fileId },
      data: { chunkPaths },
    });

    await prisma.job.update({
      where: { id: jobId },
      data: { totalChunks: numChunks },
    });

    // Wait for all parallel transcriptions to settle
    const results = await Promise.allSettled(transcriptionPromises);
    const failed = results.filter((r) => r.status === 'rejected');

    if (failed.length > 0) {
      throw new Error(
        `${failed.length}/${numChunks} chunks failed to transcribe`
      );
    }

    helpers.logger.info(
      `Chunking + transcription complete for job ${jobId}: ${numChunks} chunks`
    );
  } catch (error) {
    helpers.logger.error(`Chunking failed for job ${jobId}: ${error.message}`);

    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
};
