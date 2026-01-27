import type { MediaFile, Transcription, TranscriptionSegment } from "@/types/transcription";
import { ProcessingStatus } from "@/types/transcription";

// Helper to format bytes to human readable size
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// Helper to format seconds to time string (MM:SS or HH:MM:SS)
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Sample transcription segments
const sampleSegments: TranscriptionSegment[] = [
  {
    id: "seg-1",
    startTime: 0,
    endTime: 3.5,
    text: "Welcome to this audio transcription demonstration.",
    speaker: "Speaker 1",
    confidence: 0.98,
  },
  {
    id: "seg-2",
    startTime: 3.5,
    endTime: 7.2,
    text: "Today we'll be exploring the features of our new transcription service.",
    speaker: "Speaker 1",
    confidence: 0.95,
  },
  {
    id: "seg-3",
    startTime: 7.2,
    endTime: 11.8,
    text: "This service supports both audio and video files in multiple formats.",
    speaker: "Speaker 2",
    confidence: 0.97,
  },
  {
    id: "seg-4",
    startTime: 11.8,
    endTime: 16.5,
    text: "You can upload MP3, WAV, M4A, MP4, WebM, and many other popular formats.",
    speaker: "Speaker 2",
    confidence: 0.96,
  },
  {
    id: "seg-5",
    startTime: 16.5,
    endTime: 21.0,
    text: "The transcription process is fast and accurate, with real-time progress updates.",
    speaker: "Speaker 1",
    confidence: 0.99,
  },
  {
    id: "seg-6",
    startTime: 21.0,
    endTime: 26.3,
    text: "Each transcription includes timestamps for easy navigation through the content.",
    speaker: "Speaker 1",
    confidence: 0.94,
  },
  {
    id: "seg-7",
    startTime: 26.3,
    endTime: 31.8,
    text: "Speaker identification is also available, making it perfect for meetings and interviews.",
    speaker: "Speaker 2",
    confidence: 0.97,
  },
  {
    id: "seg-8",
    startTime: 31.8,
    endTime: 36.0,
    text: "Thank you for trying out our transcription service!",
    speaker: "Speaker 1",
    confidence: 0.98,
  },
];

// Sample transcription with partial data (for processing state)
const partialSegments: TranscriptionSegment[] = sampleSegments.slice(0, 4);

// Create transcription object
function createTranscription(
  mediaFileId: string,
  segments: TranscriptionSegment[]
): Transcription {
  return {
    mediaFileId,
    segments,
    fullText: segments.map((s) => s.text).join(" "),
    language: "en",
    createdAt: new Date(),
  };
}

// Sample media files
export const mockMediaFiles: MediaFile[] = [
  {
    id: "file-1",
    name: "interview-recording.mp3",
    type: "audio",
    mimeType: "audio/mpeg",
    size: 4_200_000, // ~4.2 MB
    duration: 36.0,
    status: ProcessingStatus.COMPLETED,
    uploadProgress: 100,
    transcription: createTranscription("file-1", sampleSegments),
    createdAt: new Date(Date.now() - 3600000), // 1 hour ago
  },
  {
    id: "file-2",
    name: "meeting-recording.m4a",
    type: "audio",
    mimeType: "audio/mp4",
    size: 8_500_000, // ~8.5 MB
    duration: 72.5,
    status: ProcessingStatus.PROCESSING,
    uploadProgress: 100,
    transcription: createTranscription("file-2", partialSegments),
    createdAt: new Date(Date.now() - 1800000), // 30 min ago
  },
  {
    id: "file-3",
    name: "product-demo-video.mp4",
    type: "video",
    mimeType: "video/mp4",
    size: 45_000_000, // ~45 MB
    duration: 120.0,
    status: ProcessingStatus.UPLOADING,
    uploadProgress: 65,
    createdAt: new Date(Date.now() - 300000), // 5 min ago
  },
  {
    id: "file-4",
    name: "podcast-episode.mp3",
    type: "audio",
    mimeType: "audio/mpeg",
    size: 52_000_000, // ~52 MB
    duration: 1800, // 30 minutes
    status: ProcessingStatus.COMPLETED,
    uploadProgress: 100,
    transcription: createTranscription("file-4", sampleSegments),
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
  },
];

// Simulate file upload with progress
export function simulateFileUpload(
  _file: File,
  onProgress: (progress: number) => void
): Promise<string> {
  return new Promise((resolve) => {
    const mediaFileId = `file-${Date.now()}`;
    let progress = 0;

    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        resolve(mediaFileId);
      }
      onProgress(Math.round(progress));
    }, 200);
  });
}

// Simulate transcription processing with polling
export function simulateProcessing(
  _mediaFileId: string,
  onUpdate: (status: ProcessingStatus, progress?: number) => void
): () => void {
  let progress = 0;
  let status: ProcessingStatus = ProcessingStatus.PROCESSING;

  const interval = setInterval(() => {
    progress += Math.random() * 10;

    if (progress >= 100) {
      progress = 100;
      status = ProcessingStatus.COMPLETED;
      clearInterval(interval);
    }

    onUpdate(status, Math.round(progress));
  }, 1000);

  return () => clearInterval(interval);
}

// Get active segment for a given time
export function getActiveSegment(
  segments: TranscriptionSegment[],
  currentTime: number
): TranscriptionSegment | null {
  return (
    segments.find(
      (seg) => currentTime >= seg.startTime && currentTime < seg.endTime
    ) || null
  );
}

// Find segment index by time
export function findSegmentIndexByTime(
  segments: TranscriptionSegment[],
  time: number
): number {
  return segments.findIndex((seg) => time >= seg.startTime && time < seg.endTime);
}
