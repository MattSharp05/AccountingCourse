import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Check, Film } from 'lucide-react';
import { BrandButton, ProgressBar } from '../ui';

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
    if (isFinite(video.duration)) {
      video.currentTime = percent * video.duration;
    }
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
        <div className="aspect-video bg-brand-dark-lighter border border-white/10 rounded-2xl flex items-center justify-center relative overflow-hidden">
          <div className="text-center z-10 px-6">
            <motion.div
              className="mb-4 flex justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Film className="w-14 h-14 text-brand-accent" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-[#9ca3af] mb-4">Video content coming soon</p>
            <p className="text-sm text-[#6b7280]">
              This placeholder demonstrates the video player interface.
            </p>
          </div>
        </div>

        {/* Simulated progress bar */}
        <div className="bg-brand-dark-lighter border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between text-sm text-[#9ca3af] mb-2">
            <span>0:00</span>
            <span>~5:00 (estimated)</span>
          </div>
          <ProgressBar value={0} variant="default" size="md" />
        </div>

        <div className="flex justify-end">
          <BrandButton onClick={onComplete} variant="primary">
            Mark as Watched
          </BrandButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video container */}
      <div className="relative aspect-video bg-black rounded-2xl overflow-hidden group border border-white/10">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          crossOrigin="anonymous"
          className="w-full h-full object-contain"
          onClick={togglePlay}
        />

        {/* Play/Pause overlay */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: isPlaying ? 0 : 1 }}
          whileHover={{ opacity: 1 }}
          onClick={togglePlay}
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-20 h-20 rounded-full bg-brand-accent text-brand-dark flex items-center justify-center shadow-lg"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </motion.button>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="bg-brand-dark-lighter border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm text-[#9ca3af] mb-2">
          <span>{formatTime(videoRef.current?.currentTime || 0)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Progress bar (clickable) */}
        <div
          className="h-3 bg-white/5 rounded-full cursor-pointer overflow-hidden"
          onClick={handleSeek}
        >
          <motion.div
            className="h-full bg-brand-accent rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <BrandButton variant="ghost" size="sm" onClick={togglePlay}>
              {isPlaying ? (
                <span className="inline-flex items-center gap-1.5">
                  <Pause className="w-4 h-4" /> Pause
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Play className="w-4 h-4" /> Play
                </span>
              )}
            </BrandButton>
          </div>

          {hasWatched && (
            <span className="inline-flex items-center gap-1.5 text-brand-accent font-medium">
              <Check className="w-4 h-4" /> Video watched
            </span>
          )}
        </div>
      </div>

      {/* Complete button */}
      <div className="flex justify-end">
        <BrandButton
          onClick={onComplete}
          variant="primary"
          disabled={!hasWatched && !!videoUrl}
        >
          {hasWatched ? 'Complete & Continue' : 'Watch to continue'}
        </BrandButton>
      </div>
    </div>
  );
}

export default VideoPlayer;
