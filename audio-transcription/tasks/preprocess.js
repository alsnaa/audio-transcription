import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import prisma from '../services/db.js';

export default async (payload, helpers) => {
  const { jobId, fileId } = payload;

  helpers.logger.info(`Starting pre-processing for job ${jobId}`);

  const file = await prisma.file.findUnique({ where: { id: fileId } });

  if (!file) {
    throw new Error(`File ${fileId} not found`);
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  const outputPath = path.join('uploads', `${fileId}.wav`);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(file.filePath)
        .audioFrequency(16000)
        .audioChannels(1)
        .format('wav')
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    await prisma.file.update({
      where: { id: fileId },
      data: { processedFilePath: outputPath },
    });

    await helpers.addJob('transcription', { jobId, fileId });

    helpers.logger.info(
      `Pre-processing complete for job ${jobId}: ${outputPath}`
    );
  } catch (error) {
    helpers.logger.error(
      `Pre-processing failed for job ${jobId}: ${error.message}`
    );

    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
};
