import { Progress } from "@/components/ui/progress";
import type { MediaFile } from "@/types/transcription";
import { formatBytes } from "@/lib/mock-data";

interface UploadProgressBarProps {
  files: MediaFile[];
}

export function UploadProgressBar({ files }: UploadProgressBarProps) {
  // Filter files that are actively uploading or processing
  const activeFiles = files.filter(
    (f) =>
      f.status === "uploading" || f.status === "processing"
  );

  if (activeFiles.length === 0) return null;

  // Calculate overall progress
  const totalProgress =
    activeFiles.reduce((sum, file) => sum + file.uploadProgress, 0) /
    activeFiles.length;

  return (
    <div className="border-b border-border bg-muted/30 px-4 py-2">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">Upload Progress</span>
        <span className="text-muted-foreground">{Math.round(totalProgress)}%</span>
      </div>

      <Progress value={totalProgress} className="h-2" />

      {/* Individual file progress */}
      <div className="mt-2 space-y-1">
        {activeFiles.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span className="flex-1 truncate">{file.name}</span>
            <span className="whitespace-nowrap">
              {formatBytes(file.size)}
            </span>
            <span className="whitespace-nowrap">{file.uploadProgress}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
