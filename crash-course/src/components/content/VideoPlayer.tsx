import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button, ProgressBar } from '../ui';

interface VideoPlayerProps {
  videoUrl?: string;
  title: string;
  onComplete: () => void;
  thumbnailUrl?: string;
}

export function VideoPlayer({
  videoUrl,
  title,
  onComplete,
  thumbnailUrl,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasWatched, setHasWatched] = useState(false);

  // Track progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentProgress = (video.currentTime / video.duration) * 100;
      setProgress(currentProgress);

      // Mark as watched if they've seen 90%
      if (currentProgress > 90 && !hasWatched) {
        setHasWatched(true);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setHasWatched(true);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [hasWatched]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * video.duration;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Placeholder video UI when no video URL is provided
  if (!videoUrl) {
    return (
      <div className="space-y-4">
        <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center relative overflow-hidden">
          {/* Decorative background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-4 text-6xl">📚</div>
            <div className="absolute bottom-4 right-4 text-6xl">🎓</div>
          </div>

          <div className="text-center z-10">
            <motion.div
              className="text-6xl mb-4"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🎬
            </motion.div>
            <h3 className="text-xl font-bold text-primary-800 mb-2">{title}</h3>
            <p className="text-primary-600 mb-4">Video content coming soon!</p>
            <p className="text-sm text-primary-500">
              This placeholder demonstrates the video player interface.
            </p>
          </div>
        </div>

        {/* Simulated progress bar */}
        <div className="bg-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>0:00</span>
            <span>~5:00 (estimated)</span>
          </div>
          <ProgressBar value={0} variant="default" size="md" />
        </div>

        <div className="flex justify-end">
          <Button onClick={onComplete} variant="primary">
            Mark as Watched ✓
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video container */}
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden group">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          className="w-full h-full object-contain"
          onClick={togglePlay}
        />

        {/* Play/Pause overlay */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: isPlaying ? 0 : 1 }}
          whileHover={{ opacity: 1 }}
          onClick={togglePlay}
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg"
          >
            <span className="text-3xl ml-1">
              {isPlaying ? '⏸️' : '▶️'}
            </span>
          </motion.button>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>{formatTime(videoRef.current?.currentTime || 0)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Progress bar (clickable) */}
        <div
          className="h-3 bg-gray-300 rounded-full cursor-pointer overflow-hidden"
          onClick={handleSeek}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={togglePlay}>
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </Button>
          </div>

          {hasWatched && (
            <span className="text-accent-600 font-medium">
              ✓ Video watched
            </span>
          )}
        </div>
      </div>

      {/* Complete button */}
      <div className="flex justify-end">
        <Button
          onClick={onComplete}
          variant="primary"
          disabled={!hasWatched && !!videoUrl}
        >
          {hasWatched ? 'Complete & Continue →' : 'Watch to continue'}
        </Button>
      </div>
    </div>
  );
}

export default VideoPlayer;
