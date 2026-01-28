# 🧠 AI Audio Transcription System — Master Context

## 🎯 Goal

Build a **self-hosted AI transcription platform** that:

- Accepts long audio/video files
- Processes them in the background
- Uses Whisper AI locally
- Shows progress in real time
- Stores partial results safely
- Scales later

Tech stack:

- **React (Vite)** — frontend
- **Express (Node.js)** — API
- **Postgres** — database
- **Prisma** — ORM
- **Graphile Worker** — background jobs
- **Whisper (Docker)** — AI engine
- **FFmpeg** — audio processing

## 🧩 System Architecture

[ React Frontend ]
|
| Upload
v
[ Express API ]
|
| Save file + create Job
v
[ Postgres ]
├── jobs table
├── chunks table
└── graphile_worker.jobs
|
v
[ Graphile Worker ]
|
| Extract audio
| Split into chunks
| Send to Whisper
| Save chunk text
v
[ Whisper Docker API ]

## 🧩 Processing Flow

1. User uploads file
2. Express saves file
3. Express creates Job in Postgres
4. Express returns jobId immediately
5. Graphile Worker picks job
6. Worker extracts audio, splits into chunks, sends to Whisper, saves results
7. Job marked done
8. Frontend polls and displays transcript

## 🎯 Final Result

Self-hosted, private, scalable transcription system.
