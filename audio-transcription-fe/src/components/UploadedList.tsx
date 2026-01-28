import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileAudio, FileVideo, Clock, CheckCircle2, Loader2 } from "lucide-react";
import type { MediaFile } from "@/types/transcription";
import { ProcessingStatus } from "@/types/transcription";
import { formatTime, formatBytes } from "@/lib/mock-data";

interface UploadedListProps {
  files: MediaFile[];
  selectedFileId: string | null;
  onFileSelect: (file: MediaFile) => void;
}

function getStatusBadge(status: ProcessingStatus) {
  switch (status) {
    case ProcessingStatus.UPLOADING:
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Uploading
        </Badge>
      );
    case ProcessingStatus.PROCESSING:
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case ProcessingStatus.COMPLETED:
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      );
    case ProcessingStatus.ERROR:
      return <Badge variant="destructive">Error</Badge>;
    default:
      return <Badge variant="outline">Idle</Badge>;
  }
}

function getFileIcon(type: "audio" | "video") {
  return type === "audio" ? (
    <FileAudio className="h-5 w-5 text-muted-foreground" />
  ) : (
    <FileVideo className="h-5 w-5 text-muted-foreground" />
  );
}

export function UploadedList({
  files,
  selectedFileId,
  onFileSelect,
}: UploadedListProps) {
  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center border-l border-border bg-muted/20">
        <div className="text-center">
          <p className="text-muted-foreground">No files uploaded yet</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Upload audio or video files to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="border-l border-border bg-muted/20 p-2">
        <div className="space-y-2">
          {files.map((file) => {
            const isSelected = file.id === selectedFileId;
            const isProcessing =
              file.status === ProcessingStatus.UPLOADING ||
              file.status === ProcessingStatus.PROCESSING;

            return (
              <Card
                key={file.id}
                className={`cursor-pointer transition-colors hover:bg-accent ${
                  isSelected ? "bg-accent border-primary" : ""
                }`}
                onClick={() => onFileSelect(file)}
              >
                <CardContent className="flex items-start gap-3 p-3">
                  {/* File Icon */}
                  <div className="mt-1">{getFileIcon(file.type)}</div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(file.duration)}
                          </span>
                          {file.size > 0 && (
                            <>
                              <span>•</span>
                              <span>{formatBytes(file.size)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(file.status)}
                    </div>

                    {/* Progress bar for uploading/processing */}
                    {isProcessing && (
                      <div className="space-y-1">
                        <Progress value={file.uploadProgress} className="h-1" />
                        <p className="text-xs text-muted-foreground">
                          {file.uploadProgress}%
                        </p>
                      </div>
                    )}

                    {/* Transcription preview */}
                    {file.status === ProcessingStatus.COMPLETED &&
                      file.transcription && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {file.transcription.fullText}
                        </p>
                      )}

                    {/* Partial transcription for processing state */}
                    {file.status === ProcessingStatus.PROCESSING &&
                      file.transcription && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {file.transcription.fullText}
                          <span className="ml-1 animate-pulse">...</span>
                        </p>
                      )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
