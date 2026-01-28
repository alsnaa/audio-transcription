import type { TranscriptionSegment } from "@/types/transcription";

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
