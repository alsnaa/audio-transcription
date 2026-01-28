import { useEffect, useRef, useState, useMemo } from "react";
import type { MediaFile } from "@/types/transcription";
import { ProcessingStatus } from "@/types/transcription";
import { fetchSegments } from "@/services/segmentsService";
import {
  mapApiSegmentToTranscriptionSegment,
  buildTranscription,
} from "@/services/mappers";

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
  const { pollingInterval = 5000, enabled = true } = options;
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derive a stable dependency: sorted string of processing file IDs
  const processingFileIds = useMemo(() => {
    return mediaFiles
      .filter((f) => f.status === ProcessingStatus.PROCESSING)
      .map((f) => f.id)
      .sort()
      .join(",");
  }, [mediaFiles]);

  useEffect(() => {
    if (!enabled || !processingFileIds) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    setError(null);

    const ids = processingFileIds.split(",");

    const poll = async () => {
      for (const fileId of ids) {
        try {
          const data = await fetchSegments(fileId);
          const segments = data.segments.map(
            mapApiSegmentToTranscriptionSegment
          );

          if (data.status === "COMPLETED") {
            setMediaFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? {
                      ...f,
                      status: ProcessingStatus.COMPLETED,
                      transcription: buildTranscription(fileId, segments),
                    }
                  : f
              )
            );
          } else if (data.status === "FAILED") {
            setMediaFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? { ...f, status: ProcessingStatus.ERROR }
                  : f
              )
            );
          } else if (segments.length > 0) {
            // Partial transcription for live preview
            setMediaFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? {
                      ...f,
                      transcription: buildTranscription(fileId, segments),
                    }
                  : f
              )
            );
          }
        } catch (err) {
          console.error(`Polling error for file ${fileId}:`, err);
          setError(
            err instanceof Error ? err.message : "Polling error"
          );
        }
      }
    };

    // Poll immediately, then on interval
    poll();
    intervalRef.current = setInterval(poll, pollingInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [processingFileIds, setMediaFiles, enabled, pollingInterval]);

  return { isPolling, error };
}
