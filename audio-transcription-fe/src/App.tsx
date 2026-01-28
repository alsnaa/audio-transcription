import { useState, useCallback, useEffect, useRef } from "react";
import { HeaderToolbar } from "./components/HeaderToolbar";
import { UploadProgressBar } from "./components/UploadProgressBar";
import { MediaPlayer } from "./components/MediaPlayer";
import { UploadedList } from "./components/UploadedList";
import { TranscriptionView } from "./components/TranscriptionView";
import { useTranscriptionPolling } from "./hooks/useTranscriptionPolling";
import type {
  MediaFile,
  TranscriptionSegment,
  TranscriptionModel,
} from "./types/transcription";
import { ProcessingStatus, DEFAULT_MODEL } from "./types/transcription";
import { fetchFiles } from "./services/filesService";
import { fetchSegments } from "./services/segmentsService";
import { transcribeFile } from "./services/transcribeService";
import {
  mapApiFileToMediaFile,
  mapApiSegmentToTranscriptionSegment,
  buildTranscription,
} from "./services/mappers";

function App() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] =
    useState<TranscriptionModel>(DEFAULT_MODEL);

  // Seek ref for the media player
  const seekToRef = useRef<((time: number) => void) | null>(null);

  // Load files from API on mount
  useEffect(() => {
    fetchFiles()
      .then((apiFiles) => {
        const mapped = apiFiles.map(mapApiFileToMediaFile);
        setMediaFiles(mapped);
        if (mapped.length > 0) {
          setSelectedFileId(mapped[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch files:", err);
      });
  }, []);

  // Polling hook for processing files
  const { isPolling } = useTranscriptionPolling(mediaFiles, setMediaFiles, {
    enabled: true,
    pollingInterval: 5000,
  });

  // Get the currently selected file
  const selectedFile = mediaFiles.find((f) => f.id === selectedFileId) || null;

  // Load segments for completed files when selected
  useEffect(() => {
    if (
      !selectedFile ||
      selectedFile.status !== ProcessingStatus.COMPLETED ||
      selectedFile.transcription
    ) {
      return;
    }

    fetchSegments(selectedFile.id)
      .then((data) => {
        const segments = data.segments.map(mapApiSegmentToTranscriptionSegment);
        const transcription = buildTranscription(selectedFile.id, segments);
        setMediaFiles((prev) =>
          prev.map((f) =>
            f.id === selectedFile.id ? { ...f, transcription } : f,
          ),
        );
      })
      .catch((err) => {
        console.error("Failed to fetch segments:", err);
      });
  }, [selectedFile?.id, selectedFile?.status, selectedFile?.transcription]);

  // Handle file upload
  const handleFileSelect = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const tempId = `temp-${Date.now()}-${Math.random()}`;

      // Optimistic UI: add file immediately
      const newFile: MediaFile = {
        id: tempId,
        name: file.name,
        type: file.type.startsWith("video") ? "video" : "audio",
        mimeType: file.type,
        size: file.size,
        duration: 0,
        status: ProcessingStatus.UPLOADING,
        uploadProgress: 0,
        createdAt: new Date(),
      };

      setMediaFiles((prev) => [newFile, ...prev]);
      setSelectedFileId(tempId);

      try {
        const response = await transcribeFile(file, {
          model: selectedModel,
          onUploadProgress: (event) => {
            const progress = event.total
              ? Math.round((event.loaded / event.total) * 100)
              : 0;
            setMediaFiles((prev) =>
              prev.map((f) =>
                f.id === tempId ? { ...f, uploadProgress: progress } : f,
              ),
            );
          },
        });

        // Swap temp ID with real fileId and set the file URL
        const realId = response.fileId;
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
        const fileUrl = `${baseUrl}/${response.filePath}`;

        setMediaFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? {
                  ...f,
                  id: realId,
                  status: ProcessingStatus.PROCESSING,
                  uploadProgress: 100,
                  fileUrl,
                }
              : f,
          ),
        );

        // Fix race condition: update selectedFileId if it was the temp ID
        setSelectedFileId((prev) => (prev === tempId ? realId : prev));
      } catch (err) {
        console.error("Upload failed:", err);
        setMediaFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, status: ProcessingStatus.ERROR } : f,
          ),
        );
      }
    }
  }, [selectedModel]);

  // Handle file selection from list
  const handleFileClick = useCallback((file: MediaFile) => {
    setSelectedFileId(file.id);
    setActiveSegmentId(null);
  }, []);

  // Handle segment click (seek to timestamp)
  const handleSegmentClick = useCallback((segment: TranscriptionSegment) => {
    setActiveSegmentId(segment.id);
    seekToRef.current?.(segment.startTime);
  }, []);

  // Handle media time update (for highlighting active segment)
  const handleTimeUpdate = useCallback(
    (time: number) => {
      if (selectedFile?.transcription) {
        const activeSegment = selectedFile.transcription.segments.find(
          (seg) => time >= seg.startTime && time < seg.endTime,
        );
        setActiveSegmentId(activeSegment?.id || null);
      }
    },
    [selectedFile],
  );

  // Count uploading/processing files
  const activeUploadCount = mediaFiles.filter(
    (f) =>
      f.status === ProcessingStatus.UPLOADING ||
      f.status === ProcessingStatus.PROCESSING,
  ).length;

  // Get media URL from the file's API-provided URL
  const selectedMediaUrl = selectedFile?.fileUrl;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <HeaderToolbar
        onFileSelect={handleFileSelect}
        uploadCount={activeUploadCount}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />

      {/* Upload Progress Bar */}
      <UploadProgressBar files={mediaFiles} />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - Media Player & File List */}
        <div className="flex flex-1 flex-col border-r border-border">
          {/* Media Player */}
          <MediaPlayer
            mediaFile={selectedFile}
            mediaUrl={selectedMediaUrl}
            seekRef={seekToRef}
            onTimeUpdate={handleTimeUpdate}
          />

          {/* Uploaded Files List */}
          <UploadedList
            files={mediaFiles}
            selectedFileId={selectedFileId}
            onFileSelect={handleFileClick}
          />
        </div>

        {/* Right Column - Transcription View */}
        <div className="flex-1 overflow-hidden">
          <TranscriptionView
            mediaFile={selectedFile}
            activeSegmentId={activeSegmentId}
            onSegmentClick={handleSegmentClick}
          />
        </div>
      </div>

      {/* Polling Indicator */}
      {isPolling && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg">
          <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
          Processing files...
        </div>
      )}
    </div>
  );
}

export default App;
