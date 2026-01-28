# Audio Transcription Pipeline - Architecture

## Overview

The system transcribes audio/video files into time-stamped text segments. It uses an asynchronous job queue to decouple the upload from processing, and splits long audio into chunks that are transcribed in parallel for throughput.

```
Client Upload ──> API Server ──> Job Queue ──> Worker
                                                 │
                                          ┌──────┴──────┐
                                          │  Preprocess  │
                                          │  (FFmpeg)    │
                                          └──────┬──────┘
                                                 │
                                          ┌──────┴──────┐
                                          │   Chunking   │
                                          │  + Parallel  │
                                          │ Transcription│
                                          └──────┬──────┘
                                                 │
                                          ┌──────┴──────┐
                                          │   Database   │
                                          │  (Segments)  │
                                          └─────────────┘
```

## Pipeline Stages

### Stage 1: Upload & Job Creation

The client uploads an audio/video file via `POST /transcribe`. The server:

1. Saves the original file to disk with a UUID filename
2. Creates a `File` record in the database
3. Creates a `Job` record with status `PENDING`
4. Enqueues a **preprocess** task to the job queue
5. Returns `jobId` and `fileId` immediately (non-blocking)

The client can then poll for progress using the returned IDs.

### Stage 2: Preprocessing

The worker picks up the `preprocess` task and:

1. Sets job status to `PROCESSING`
2. Converts the original file to a normalized WAV format:
   - Sample rate: **16 kHz**
   - Channels: **mono**
   - Format: **WAV**
3. Stores the processed file path in the database
4. Enqueues the **transcription** task

**Why normalize?** The transcription model expects 16 kHz mono audio. Converting once upfront avoids redundant work per chunk and ensures consistent input quality.

### Stage 3: Chunking & Parallel Transcription

This is the core of the pipeline. The worker:

1. Probes the processed audio to get the total duration
2. Stores the duration on the `File` record
3. Decides the chunking strategy:

**Short audio (duration <= 5 minutes):**
- Skips chunking entirely
- Sends the whole file to the transcription service
- Single-chunk fast path

**Long audio (duration > 5 minutes):**
- Calculates the number of chunks: `ceil(duration / 300)`
- Splits the audio sequentially using FFmpeg (each chunk = 5 min segment)
- **Fires off transcription for each chunk immediately after it's split** (does not wait for all chunks to be split first)
- All transcription requests run in parallel via `Promise.allSettled`

```
Audio File (18 min)
├── Chunk 0: 0:00 - 5:00   ──> Transcribe ──┐
├── Chunk 1: 5:00 - 10:00  ──> Transcribe ──┤  (parallel)
├── Chunk 2: 10:00 - 15:00 ──> Transcribe ──┤
└── Chunk 3: 15:00 - 18:00 ──> Transcribe ──┘
                                             │
                                    Promise.allSettled
                                             │
                                      Job COMPLETED
```

### Stage 4: Segment Storage & Timestamp Adjustment

Each chunk's transcription returns segments with **local** timestamps (relative to the chunk start). The system adjusts them to **global** timestamps:

```
Chunk 2 starts at 600s (10:00)
  Local segment:  start=12.5s, end=15.0s
  Global segment: start=612.5s, end=615.0s
```

Formula: `global_start = local_start + chunk_offset`

Segments are inserted into the database as they complete (not batched at the end). This allows the client to see partial results while transcription is still in progress.

### Stage 5: Completion & Cleanup

Each chunk, upon completion:

1. Inserts its segments into the database
2. Atomically increments `completedChunks` on the job
3. Deletes its temporary chunk file

The last chunk to finish (detected via `completedChunks === totalChunks`):

1. Sets job status to `COMPLETED`
2. Deletes the preprocessed WAV file

If any chunk fails, the entire job is marked `FAILED`.

## Data Model

```
File
├── id (UUID)
├── fileName           # Original upload name
├── filePath           # Path to original uploaded file
├── processedFilePath  # Path to normalized WAV (temporary, deleted after completion)
├── chunkPaths[]       # Paths to chunk files (temporary)
├── language           # Detected language (set during transcription)
├── duration           # Total audio duration in seconds
├── segments[]         # Related transcription segments
└── job                # Related processing job

Job
├── id (UUID)
├── fileId (FK)
├── status             # PENDING -> PROCESSING -> COMPLETED | FAILED
├── totalChunks        # Number of chunks for this file
├── completedChunks    # Atomically incremented as chunks finish
└── updatedAt          # Last status change

Segment
├── id (UUID)
├── fileId (FK)
├── start              # Global start time (seconds)
├── end                # Global end time (seconds)
└── text               # Transcribed text
```

## Job Status Lifecycle

```
PENDING ──> PROCESSING ──> COMPLETED
                │
                └──> FAILED
```

| Status | Meaning |
|---|---|
| `PENDING` | Job created, waiting for worker to pick it up |
| `PROCESSING` | Preprocessing or transcription is in progress |
| `COMPLETED` | All chunks transcribed, segments stored |
| `FAILED` | Any stage encountered an unrecoverable error |

## Design Decisions

### Why parallel transcription?

Sequential processing of N chunks takes N times the transcription latency. Parallel processing brings total time close to the latency of the single longest chunk. For a 30-minute file (6 chunks), this is roughly a **6x speedup**.

Trade-off: segments may appear in the database out of chronological order during processing. This is handled by always querying segments with `ORDER BY start ASC`.

### Why 5-minute chunks?

- Small enough to keep individual transcription requests fast and reduce memory usage
- Large enough to preserve sentence context at boundaries
- Aligns with typical transcription API input limits

### Why normalize before chunking?

Converting the original file to 16 kHz mono WAV once means:
- Each chunk is already in the expected format (no per-chunk conversion)
- Consistent audio properties across all chunks
- Duration probing is accurate on the normalized file

### Why a job queue (Graphile Worker)?

- Decouples the HTTP request from long-running processing
- Provides automatic retries on failure
- Job state persisted in PostgreSQL (no extra infrastructure)
- Worker concurrency is configurable

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/transcribe` | Upload file, start pipeline |
| `GET` | `/jobs/:id` | Poll job status and progress (`completedChunks / totalChunks`) |
| `GET` | `/segments/:fileId` | Get transcribed segments (sorted by start time) |
| `GET` | `/files` | List all files with their job status |

## Client Polling Flow

```
1. POST /transcribe         -> { jobId, fileId }
2. GET  /jobs/:jobId         -> { status, completedChunks, totalChunks }
   (repeat until status = COMPLETED or FAILED)
3. GET  /segments/:fileId    -> { segments: [...] }
```

During processing, the client can call `/segments/:fileId` to get partial results. Segments are always returned sorted by `start` time regardless of insertion order.
