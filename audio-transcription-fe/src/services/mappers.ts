import type { ApiFile, ApiSegment } from "@/types/api";
import type {
  MediaFile,
  TranscriptionSegment,
  Transcription,
} from "@/types/transcription";
import { ProcessingStatus } from "@/types/transcription";

export function mapApiFileToMediaFile(apiFile: ApiFile): MediaFile {
  let status: ProcessingStatus;
  switch (apiFile.status) {
    case "COMPLETED":
      status = ProcessingStatus.COMPLETED;
      break;
    case "FAILED":
      status = ProcessingStatus.ERROR;
      break;
    default:
      status = ProcessingStatus.PROCESSING;
      break;
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const fileUrl = apiFile.filePath
    ? `${baseUrl}/${apiFile.filePath}`
    : undefined;

  const detectedMimeType = apiFile.mimeType || "audio/mpeg";
  const type = detectedMimeType.startsWith("video") ? "video" as const : "audio" as const;

  return {
    id: apiFile.id,
    name: apiFile.fileName,
    type,
    mimeType: detectedMimeType,
    size: 0,
    duration: apiFile.duration,
    status,
    model: apiFile.model,
    uploadProgress: 100,
    fileUrl,
    transcriptionDuration: apiFile.transcriptionDuration,
    createdAt: new Date(apiFile.createdAt),
  };
}

export function mapApiSegmentToTranscriptionSegment(
  apiSegment: ApiSegment
): TranscriptionSegment {
  return {
    id: apiSegment.id,
    startTime: apiSegment.start,
    endTime: apiSegment.end,
    text: apiSegment.text,
  };
}

export function buildTranscription(
  fileId: string,
  segments: TranscriptionSegment[],
  language?: string
): Transcription {
  return {
    mediaFileId: fileId,
    segments,
    fullText: segments.map((s) => s.text).join(" "),
    language,
    createdAt: new Date(),
  };
}
