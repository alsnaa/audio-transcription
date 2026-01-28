// Processing status for media files
export const ProcessingStatus = {
  IDLE: "idle",
  UPLOADING: "uploading",
  PROCESSING: "processing",
  COMPLETED: "completed",
  ERROR: "error",
} as const;

export type ProcessingStatus = (typeof ProcessingStatus)[keyof typeof ProcessingStatus];

// Media file metadata
export interface MediaFile {
  id: string;
  name: string;
  type: "audio" | "video";
  mimeType: string;
  size: number; // in bytes
  duration: number; // in seconds
  status: ProcessingStatus;
  uploadProgress: number; // 0-100
  fileUrl?: string;
  transcription?: Transcription;
  createdAt: Date;
}

// Individual transcription segment with timestamp
export interface TranscriptionSegment {
  id: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
  speaker?: string; // Optional speaker label
  confidence?: number; // 0-1, optional confidence score
}

// Complete transcription data
export interface Transcription {
  mediaFileId: string;
  segments: TranscriptionSegment[];
  fullText: string;
  language?: string;
  createdAt: Date;
}

// Upload queue item
export interface UploadQueueItem {
  file: File;
  mediaFileId: string;
  progress: number;
  status: ProcessingStatus;
}

// Media player state
export interface MediaPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

// Transcription polling state
export interface PollingState {
  isPolling: boolean;
  lastChecked: Date | null;
  error: string | null;
}
