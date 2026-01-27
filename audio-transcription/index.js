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

app.get('/', (req, res) => {
  res.send('Transcription server running');
});

app.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided. Use field name "audio".' });
  }

  try {
    const job = await prisma.job.create({
      data: {
        fileName: req.file.originalname,
        filePath: req.file.path,
      },
    });

    await quickAddJob(
      { connectionString: process.env.DATABASE_URL },
      'preprocess',
      { jobId: job.id }
    );

    res.status(201).json({ jobId: job.id });
  } catch (error) {
    next(error);
  }
});

app.get('/jobs/:id', async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${err.message}`);
  console.error(err.stack);

  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
