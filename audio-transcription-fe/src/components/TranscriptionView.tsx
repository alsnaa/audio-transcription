import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { MediaFile, TranscriptionSegment } from "@/types/transcription";
import { formatTime } from "@/lib/mock-data";

interface TranscriptionViewProps {
  mediaFile: MediaFile | null;
  activeSegmentId: string | null;
  onSegmentClick?: (segment: TranscriptionSegment) => void;
}

export function TranscriptionView({
  mediaFile,
  activeSegmentId,
  onSegmentClick,
}: TranscriptionViewProps) {
  if (!mediaFile) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">No transcription selected</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Select a file from the list to view its transcription
          </p>
        </div>
      </div>
    );
  }

  if (!mediaFile.transcription) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">
            {mediaFile.status === "processing"
              ? "Transcription in progress..."
              : "No transcription available"}
          </p>
        </div>
      </div>
    );
  }

  const { segments, language } = mediaFile.transcription;
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSegmentId && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeSegmentId]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold">{mediaFile.name}</h2>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span>{segments.length} segments</span>
          {language && <span>•</span>}
          {language && <span className="uppercase">{language}</span>}
        </div>
      </div>

      {/* Transcription Content */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-6">
          {segments.map((segment: TranscriptionSegment, index: number) => {
            const isActive = segment.id === activeSegmentId;

            return (
              <div
                key={segment.id}
                ref={isActive ? activeRef : undefined}
                className={`group rounded-lg border border-border p-4 transition-colors hover:bg-accent cursor-pointer ${
                  isActive ? "bg-accent border-primary" : ""
                }`}
                onClick={() => onSegmentClick?.(segment)}
              >
                <div className="flex items-start gap-3">
                  {/* Timestamp */}
                  <button
                    className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSegmentClick?.(segment);
                    }}
                  >
                    <Clock className="h-3 w-3" />
                    <span className="font-mono tabular-nums">
                      {formatTime(segment.startTime)}
                    </span>
                  </button>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    {/* Speaker label */}
                    {segment.speaker && (
                      <Badge variant="outline" className="text-xs">
                        {segment.speaker}
                      </Badge>
                    )}

                    {/* Text */}
                    <p className="text-sm leading-relaxed">{segment.text}</p>

                    {/* Confidence score */}
                    {segment.confidence !== undefined && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Confidence:</span>
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${segment.confidence * 100}%`,
                            }}
                          />
                        </div>
                        <span className="tabular-nums">
                          {Math.round(segment.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Segment number */}
                  <span className="shrink-0 text-xs text-muted-foreground/60">
                    #{index + 1}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
