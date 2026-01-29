import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import multer from 'multer';
import dotenv from 'dotenv';
import { quickAddJob } from 'graphile-worker';
import prisma from './services/db.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

const PORT = process.env.PORT || 3000;

const ALLOWED_MODELS = ['whisper-local', 'elevenlabs-scribe'];

app.get('/', (req, res) => {
  res.send('Transcription server running');
});

app.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: 'No audio file provided. Use field name "audio".' });
  }

  try {
    const model = ALLOWED_MODELS.includes(req.body.model)
      ? req.body.model
      : 'whisper-local';

    const file = await prisma.file.create({
      data: {
        fileName: req.file.originalname,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        model,
      },
    });

    const job = await prisma.job.create({
      data: { fileId: file.id },
    });

    await quickAddJob(
      { connectionString: process.env.DATABASE_URL },
      'preprocess',
      { jobId: job.id, fileId: file.id }
    );

    res.status(201).json({ jobId: job.id, fileId: file.id, filePath: file.filePath });
  } catch (error) {
    next(error);
  }
});

app.get('/jobs/:id', async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { file: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const transcriptionDuration =
      job.status === 'COMPLETED' && job.startedAt
        ? (job.updatedAt - job.startedAt) / 1000
        : null;

    res.json({ ...job, transcriptionDuration });
  } catch (error) {
    next(error);
  }
});

app.get('/segments/:fileId', async (req, res, next) => {
  try {
    const file = await prisma.file.findUnique({
      where: { id: req.params.fileId },
      include: {
        segments: { orderBy: { start: 'asc' } },
        job: true,
      },
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const job = file.job;
    const transcriptionDuration =
      job?.status === 'COMPLETED' && job.startedAt
        ? (job.updatedAt - job.startedAt) / 1000
        : null;

    res.json({
      fileId: file.id,
      status: job?.status ?? 'PENDING',
      transcriptionDuration,
      segments: file.segments,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/files', async (req, res, next) => {
  try {
    const files = await prisma.file.findMany({
      include: { job: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      files.map((file) => {
        const job = file.job;
        const transcriptionDuration =
          job?.status === 'COMPLETED' && job.startedAt
            ? (job.updatedAt - job.startedAt) / 1000
            : null;

        return {
          id: file.id,
          fileName: file.fileName,
          filePath: file.filePath,
          mimeType: file.mimeType,
          duration: file.duration,
          language: file.language,
          model: file.model,
          status: job?.status ?? 'PENDING',
          transcriptionDuration,
          createdAt: file.createdAt,
        };
      })
    );
  } catch (error) {
    next(error);
  }
});

app.delete('/files/:id', async (req, res, next) => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete related records in order: segments → job → file
    await prisma.segment.deleteMany({ where: { fileId: file.id } });
    await prisma.job.deleteMany({ where: { fileId: file.id } });
    await prisma.file.delete({ where: { id: file.id } });

    // Delete physical files from disk, ignoring "not found" errors
    const filePaths = [
      file.filePath,
      file.processedFilePath,
      ...(file.chunkPaths || []),
    ].filter(Boolean);

    await Promise.all(
      filePaths.map((p) => fs.unlink(p).catch(() => {}))
    );

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${err.message}`
  );
  console.error(err.stack);

  res
    .status(err.status || 500)
    .json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
