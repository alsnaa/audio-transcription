export interface ApiTranscribeResponse {
  jobId: string;
  fileId: string;
  filePath: string;
}

export interface ApiFile {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  duration: number;
  language: string;
  model: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  transcriptionDuration: number | null;
  createdAt: string;
}

export interface ApiSegment {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface ApiSegmentsResponse {
  fileId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  transcriptionDuration: number | null;
  segments: ApiSegment[];
}

export interface ApiJob {
  id: string;
  fileId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalChunks: number;
  completedChunks: number;
  file: ApiFile;
}
