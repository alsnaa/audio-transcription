import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import prisma from '../services/db.js';

const DEFAULT_CHUNK_DURATION = 300; // 5 minutes in seconds

export default async (payload, helpers) => {
  const { jobId, chunkDuration = DEFAULT_CHUNK_DURATION } = payload;

  helpers.logger.info(`Starting chunking for job ${jobId}`);

  const job = await prisma.job.findUnique({ where: { id: jobId } });

  if (!job || !job.processedFilePath) {
    throw new Error(`Job ${jobId} not found or not preprocessed`);
  }

  try {
    // Get audio duration via ffprobe
    const duration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(job.processedFilePath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration);
      });
    });

    helpers.logger.info(`Audio duration for job ${jobId}: ${duration}s`);

    // If audio is shorter than chunk duration, use the file as-is
    if (duration <= chunkDuration) {
      await prisma.job.update({
        where: { id: jobId },
        data: { chunkPaths: [job.processedFilePath] },
      });

      await helpers.addJob('transcribe', {
        jobId,
        chunkIndex: 0,
        chunkPath: job.processedFilePath,
        totalChunks: 1,
      });

      helpers.logger.info(
        `Audio shorter than ${chunkDuration}s, no splitting needed for job ${jobId}`
      );
      return;
    }

    // Calculate number of chunks
    const numChunks = Math.ceil(duration / chunkDuration);
    const chunkPaths = [];

    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkDuration;
      const chunkPath = path.join('uploads', `${jobId}_chunk_${String(i).padStart(3, '0')}.wav`);

      await new Promise((resolve, reject) => {
        ffmpeg(job.processedFilePath)
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

      await helpers.addJob('transcribe', {
        jobId,
        chunkIndex: i,
        chunkPath,
        totalChunks: numChunks,
      });

      helpers.logger.info(`Created chunk ${i + 1}/${numChunks} for job ${jobId}, transcribe task queued`);
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { chunkPaths },
    });

    helpers.logger.info(`Chunking complete for job ${jobId}: ${chunkPaths.length} chunks`);
  } catch (error) {
    helpers.logger.error(`Chunking failed for job ${jobId}: ${error.message}`);

    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
};
