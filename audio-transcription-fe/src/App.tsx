import { useState, useCallback } from "react";
import { HeaderToolbar } from "./components/HeaderToolbar";
import { UploadProgressBar } from "./components/UploadProgressBar";
import { MediaPlayer } from "./components/MediaPlayer";
import { UploadedList } from "./components/UploadedList";
import { TranscriptionView } from "./components/TranscriptionView";
import { useTranscriptionPolling } from "./hooks/useTranscriptionPolling";
import type { MediaFile, TranscriptionSegment } from "./types/transcription";
import { ProcessingStatus } from "./types/transcription";
import { mockMediaFiles, simulateFileUpload } from "./lib/mock-data";

function App() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(mockMediaFiles);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    mockMediaFiles[0]?.id || null
  );
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  // Polling hook for processing files
  const { isPolling } = useTranscriptionPolling(mediaFiles, setMediaFiles, {
    enabled: true,
    pollingInterval: 2000,
  });

  // Get the currently selected file
  const selectedFile = mediaFiles.find((f) => f.id === selectedFileId) || null;

  // Handle file upload
  const handleFileSelect = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);

    // Create new media file entries
    const newFiles: MediaFile[] = fileArray.map((file) => ({
      id: `file-${Date.now()}-${Math.random()}`,
      name: file.name,
      type: file.type.startsWith("video") ? "video" : "audio",
      mimeType: file.type,
      size: file.size,
      duration: 0, // Will be updated when loaded
      status: ProcessingStatus.UPLOADING,
      uploadProgress: 0,
      createdAt: new Date(),
    }));

    setMediaFiles((prev) => [...newFiles, ...prev]);

    // Simulate upload for each file
    for (let i = 0; i < newFiles.length; i++) {
      const newFile = newFiles[i];
      await simulateFileUpload(
        fileArray[i],
        (progress) => {
          setMediaFiles((prev) =>
            prev.map((f) =>
              f.id === newFile.id
                ? { ...f, uploadProgress: progress }
                : f
            )
          );
        }
      );

      // Mark as processing after upload completes
      setMediaFiles((prev) =>
        prev.map((f) =>
          f.id === newFile.id
            ? {
                ...f,
                status: ProcessingStatus.PROCESSING,
                uploadProgress: 100,
              }
            : f
        )
      );
    }
  }, []);

  // Handle file selection from list
  const handleFileClick = useCallback((file: MediaFile) => {
    setSelectedFileId(file.id);
    setActiveSegmentId(null);
  }, []);

  // Handle segment click (seek to timestamp)
  const handleSegmentClick = useCallback((segment: TranscriptionSegment) => {
    setActiveSegmentId(segment.id);
    // In a real app, you'd seek the media player here
    // For now, we just update the active segment for highlighting
  }, []);

  // Handle media time update (for highlighting active segment)
  const handleTimeUpdate = useCallback((time: number) => {
    if (selectedFile?.transcription) {
      const activeSegment = selectedFile.transcription.segments.find(
        (seg) => time >= seg.startTime && time < seg.endTime
      );
      setActiveSegmentId(activeSegment?.id || null);
    }
  }, [selectedFile]);

  // Count uploading/processing files
  const activeUploadCount = mediaFiles.filter(
    (f) =>
      f.status === ProcessingStatus.UPLOADING ||
      f.status === ProcessingStatus.PROCESSING
  ).length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <HeaderToolbar
        onFileSelect={handleFileSelect}
        uploadCount={activeUploadCount}
      />

      {/* Upload Progress Bar */}
      <UploadProgressBar files={mediaFiles} />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - Media Player & File List */}
        <div className="flex w-2/5 flex-col border-r border-border">
          {/* Media Player */}
          <MediaPlayer
            mediaFile={selectedFile}
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
        <div className="w-3/5">
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
