import { useState, useCallback, useRef } from "react";
import type { MediaPlayerState } from "@/types/transcription";

interface UseMediaPlayerOptions {
  onTimeUpdate?: (currentTime: number) => void;
  onSeek?: (time: number) => void;
}

export function useMediaPlayer(options: UseMediaPlayerOptions = {}) {
  const { onTimeUpdate, onSeek } = options;

  const [playerState, setPlayerState] = useState<MediaPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
  });

  const mediaElementRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(
    null
  );

  // Set the media element reference
  const setMediaElement = useCallback(
    (element: HTMLVideoElement | HTMLAudioElement | null) => {
      mediaElementRef.current = element;

      if (element) {
        const handleTimeUpdate = () => {
          const time = element.currentTime;
          setPlayerState((prev: MediaPlayerState) => ({ ...prev, currentTime: time }));
          onTimeUpdate?.(time);
        };

        const handleLoadedMetadata = () => {
          setPlayerState((prev: MediaPlayerState) => ({
            ...prev,
            duration: element.duration,
          }));
        };

        const handlePlay = () => {
          setPlayerState((prev: MediaPlayerState) => ({ ...prev, isPlaying: true }));
        };

        const handlePause = () => {
          setPlayerState((prev: MediaPlayerState) => ({ ...prev, isPlaying: false }));
        };

        const handleEnded = () => {
          setPlayerState((prev: MediaPlayerState) => ({ ...prev, isPlaying: false }));
        };

        const handleVolumeChange = () => {
          setPlayerState((prev: MediaPlayerState) => ({
            ...prev,
            volume: element.volume,
            isMuted: element.muted,
          }));
        };

        element.addEventListener("timeupdate", handleTimeUpdate);
        element.addEventListener("loadedmetadata", handleLoadedMetadata);
        element.addEventListener("play", handlePlay);
        element.addEventListener("pause", handlePause);
        element.addEventListener("ended", handleEnded);
        element.addEventListener("volumechange", handleVolumeChange);

        return () => {
          element.removeEventListener("timeupdate", handleTimeUpdate);
          element.removeEventListener("loadedmetadata", handleLoadedMetadata);
          element.removeEventListener("play", handlePlay);
          element.removeEventListener("pause", handlePause);
          element.removeEventListener("ended", handleEnded);
          element.removeEventListener("volumechange", handleVolumeChange);
        };
      }
    },
    [onTimeUpdate]
  );

  // Play/pause toggle
  const togglePlay = useCallback(() => {
    const element = mediaElementRef.current;
    if (!element) return;

    if (playerState.isPlaying) {
      element.pause();
    } else {
      element.play();
    }
  }, [playerState.isPlaying]);

  // Seek to specific time
  const seek = useCallback(
    (time: number) => {
      const element = mediaElementRef.current;
      if (!element) return;

      element.currentTime = time;
      setPlayerState((prev: MediaPlayerState) => ({ ...prev, currentTime: time }));
      onSeek?.(time);
    },
    [onSeek]
  );

  // Set volume
  const setVolume = useCallback((volume: number) => {
    const element = mediaElementRef.current;
    if (!element) return;

    element.volume = volume;
    setPlayerState((prev: MediaPlayerState) => ({ ...prev, volume, isMuted: volume === 0 }));
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const element = mediaElementRef.current;
    if (!element) return;

    const newMuted = !element.muted;
    element.muted = newMuted;
    setPlayerState((prev: MediaPlayerState) => ({ ...prev, isMuted: newMuted }));
  }, []);

  // Reset player state (e.g., when changing media)
  const reset = useCallback(() => {
    setPlayerState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
    });
  }, []);

  return {
    playerState,
    setMediaElement,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    reset,
  };
}
