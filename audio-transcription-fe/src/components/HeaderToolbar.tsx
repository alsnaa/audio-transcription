import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import {
  ProcessingStatus,
  AVAILABLE_MODELS,
  MODEL_LABELS,
  type TranscriptionModel,
} from "@/types/transcription";

interface HeaderToolbarProps {
  onFileSelect: (files: FileList) => void;
  uploadStatus?: ProcessingStatus;
  uploadCount?: number;
  selectedModel: TranscriptionModel;
  onModelChange: (model: TranscriptionModel) => void;
}

export function HeaderToolbar({
  onFileSelect,
  uploadStatus,
  uploadCount = 0,
  selectedModel,
  onModelChange,
}: HeaderToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFileSelect(files);
      // Reset input so same file can be selected again
      event.target.value = "";
    }
  };

  const getUploadText = () => {
    if (uploadCount === 0) return "";
    if (uploadStatus === ProcessingStatus.UPLOADING) {
      return `Uploading ${uploadCount} file${uploadCount > 1 ? "s" : ""}...`;
    }
    if (uploadStatus === ProcessingStatus.PROCESSING) {
      return `Processing ${uploadCount} file${uploadCount > 1 ? "s" : ""}...`;
    }
    return `${uploadCount} file${uploadCount > 1 ? "s" : ""} uploaded`;
  };

  return (
    <div className="border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Transcription Studio</h1>
          {getUploadText() && (
            <span className="text-sm text-muted-foreground">
              {getUploadText()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) =>
              onModelChange(e.target.value as TranscriptionModel)
            }
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model} value={model}>
                {MODEL_LABELS[model]}
              </option>
            ))}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Button onClick={handleUploadClick} size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Media
          </Button>
        </div>
      </div>
    </div>
  );
}
