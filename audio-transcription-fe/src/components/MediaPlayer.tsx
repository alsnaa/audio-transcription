import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import type { MediaFile } from "@/types/transcription";
import { formatTime } from "@/lib/mock-data";

interface MediaPlayerProps {
  mediaFile: MediaFile | null;
  onTimeUpdate?: (currentTime: number) => void;
}

export function MediaPlayer({ mediaFile, onTimeUpdate }: MediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const mediaElement = videoRef.current;
    if (!mediaElement) return;

    const handleTimeUpdate = () => {
      const time = mediaElement.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    };

    const handleLoadedMetadata = () => {
      setDuration(mediaElement.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    mediaElement.addEventListener("timeupdate", handleTimeUpdate);
    mediaElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    mediaElement.addEventListener("ended", handleEnded);

    return () => {
      mediaElement.removeEventListener("timeupdate", handleTimeUpdate);
      mediaElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      mediaElement.removeEventListener("ended", handleEnded);
    };
  }, [onTimeUpdate]);

  const togglePlay = () => {
    const mediaElement = videoRef.current;
    if (!mediaElement) return;

    if (isPlaying) {
      mediaElement.pause();
    } else {
      mediaElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const mediaElement = videoRef.current;
    if (!mediaElement) return;

    const newTime = value[0];
    mediaElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const mediaElement = videoRef.current;
    if (!mediaElement) return;

    const newMuted = !isMuted;
    mediaElement.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    const mediaElement = videoRef.current;
    if (!mediaElement) return;

    const newVolume = value[0] / 100;
    mediaElement.volume = newVolume;
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  if (!mediaFile) {
    return (
      <div className="flex aspect-video w-full items-center justify-center border-b border-border bg-muted/20">
        <p className="text-muted-foreground">No media selected</p>
      </div>
    );
  }

  // Use a placeholder video/audio element with the media file type
  // In a real app, you'd have actual URLs to the media files
  const mediaUrl = ""; // This would be the actual URL to the media file

  return (
    <div className="border-b border-border bg-background">
      {/* Media Element */}
      <div className="relative aspect-video w-full bg-black">
        {mediaFile.type === "video" ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="h-full w-full"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <audio
            ref={videoRef}
            src={mediaUrl}
            className="hidden"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}

        {/* Audio placeholder when no video */}
        {mediaFile.type === "audio" && (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Volume2 className="h-10 w-10 text-primary" />
              </div>
              <p className="text-lg font-medium text-white">{mediaFile.name}</p>
              <p className="text-sm text-white/60">Audio File</p>
            </div>
          </div>
        )}

        {/* Placeholder for demo - remove when real media is available */}
        {!mediaUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <p className="text-muted-foreground">
              Media player ready (mock mode - no actual media)
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-2 px-4 py-3">
        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress
            value={duration > 0 ? (currentTime / duration) * 100 : 0}
            className="h-2 cursor-pointer"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              handleSeek([percent * duration]);
            }}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || mediaFile.duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              disabled={!mediaUrl}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              disabled={!mediaUrl}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>

            <div className="ml-2 flex w-24 items-center gap-2">
              <Progress
                value={isMuted ? 0 : volume * 100}
                className="h-1"
                onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  handleVolumeChange([percent * 100]);
                }}
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {mediaFile.name}
          </div>
        </div>
      </div>
    </div>
  );
}
