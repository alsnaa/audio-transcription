import { useEffect, useRef, useState } from "react";
import type { MediaFile, TranscriptionSegment } from "@/types/transcription";
import { ProcessingStatus } from "@/types/transcription";
import { simulateProcessing } from "@/lib/mock-data";

interface UseTranscriptionPollingOptions {
  pollingInterval?: number; // in milliseconds
  enabled?: boolean;
}

interface UseTranscriptionPollingReturn {
  isPolling: boolean;
  error: string | null;
}

export function useTranscriptionPolling(
  mediaFiles: MediaFile[],
  setMediaFiles: React.Dispatch<React.SetStateAction<MediaFile[]>>,
  options: UseTranscriptionPollingOptions = {}
): UseTranscriptionPollingReturn {
  const { pollingInterval = 3000, enabled = true } = options;
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activePollingRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    if (!enabled) return;

    // Find files that need polling
    const processingFiles = mediaFiles.filter(
      (f) => f.status === ProcessingStatus.PROCESSING
    );

    if (processingFiles.length === 0) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    setError(null);

    // Set up polling for each processing file
    processingFiles.forEach((file) => {
      // Skip if already polling this file
      if (activePollingRef.current.has(file.id)) return;

      // Simulate processing with progress updates
      const cleanup = simulateProcessing(
        file.id,
        (status: ProcessingStatus, progress?: number) => {
          setMediaFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? {
                    ...f,
                    status,
                    uploadProgress: progress ?? f.uploadProgress,
                  }
                : f
            )
          );

          // When completed, add transcription
          if (status === ProcessingStatus.COMPLETED) {
            // Mock transcription data - in real app, fetch from API
            const mockSegments: TranscriptionSegment[] = [
              {
                id: `seg-${file.id}-1`,
                startTime: 0,
                endTime: 5,
                text: `This is a simulated transcription for ${file.name}. `,
                speaker: "Speaker 1",
                confidence: 0.95,
              },
              {
                id: `seg-${file.id}-2`,
                startTime: 5,
                endTime: 10,
                text: "In a real application, this data would come from the backend API.",
                speaker: "Speaker 2",
                confidence: 0.97,
              },
            ];

            setMediaFiles((prev) =>
              prev.map((f) =>
                f.id === file.id
                  ? {
                      ...f,
                      status: ProcessingStatus.COMPLETED,
                      transcription: {
                        mediaFileId: file.id,
                        segments: mockSegments,
                        fullText: mockSegments.map((s) => s.text).join(" "),
                        language: "en",
                        createdAt: new Date(),
                      },
                    }
                  : f
              )
            );
          }
        }
      );

      activePollingRef.current.set(file.id, cleanup);
    });

    // Cleanup function
    return () => {
      activePollingRef.current.forEach((cleanup) => cleanup());
      activePollingRef.current.clear();
    };
  }, [mediaFiles, setMediaFiles, enabled, pollingInterval]);

  return { isPolling, error };
}
