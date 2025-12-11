
import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface YouTubePlayerViewProps {
  videoId: string;
  volume: number;
  playbackRate: number;
  onStateChange: (state: string) => void;
  onTitleChange: (title: string) => void;
  onProgress: (currentTime: number, duration: number) => void;
  onError: (errorCode: number) => void;
  onPlaybackRateChange: (rate: number) => void;
}

export interface YouTubePlayerViewRef {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number) => void;
}

const YouTubePlayerView = forwardRef<YouTubePlayerViewRef, YouTubePlayerViewProps>(({ videoId, volume, playbackRate, onStateChange, onTitleChange, onProgress, onError, onPlaybackRateChange }, ref) => {
  const playerRef = useRef<any>(null);
  const [playerDivId] = useState(`youtube-player-${Math.random().toString(36).substring(7)}`);
  const progressIntervalRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    playVideo: () => playerRef.current?.playVideo(),
    pauseVideo: () => playerRef.current?.pauseVideo(),
    seekTo: (seconds: number) => playerRef.current?.seekTo(seconds, true),
  }));

  const stopProgressInterval = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startProgressInterval = () => {
    stopProgressInterval(); // Ensure no multiple intervals are running
    progressIntervalRef.current = window.setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();
        onProgress(currentTime, duration);
      }
    }, 250);
  };

  useEffect(() => {
    const handleStateChange = (event: any) => {
        const stateMap: { [key: number]: string } = {
            '-1': 'UNSTARTED',
            0: 'ENDED',
            1: 'PLAYING',
            2: 'PAUSED',
            3: 'BUFFERING',
            5: 'CUED'
        };
        const state = stateMap[event.data] || 'UNKNOWN';
        onStateChange(state);

        if (state === 'PLAYING') {
            startProgressInterval();
        } else {
            stopProgressInterval();
        }
        
        if (state === 'CUED') {
            const videoData = event.target.getVideoData();
            if (videoData.title) {
                onTitleChange(videoData.title);
            }
            const duration = event.target.getDuration();
            if (duration) {
                onProgress(0, duration);
            }
        }
    };

    const loadPlayer = () => {
      if (document.getElementById(playerDivId) && !playerRef.current) {
        playerRef.current = new window.YT.Player(playerDivId, {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            playsinline: 1,
            autoplay: 0,
            controls: 1,
          },
          events: {
            onReady: (event: any) => {
              event.target.setVolume(volume);
              event.target.setPlaybackRate(playbackRate);
              const videoData = event.target.getVideoData();
              onTitleChange(videoData.title);
              onProgress(0, event.target.getDuration());
            },
            onStateChange: handleStateChange,
            onError: (event: any) => onError(event.data),
            onPlaybackRateChange: (event: any) => onPlaybackRateChange(event.data),
          },
        });
      }
    };

    if (!window.YT || !window.YT.Player) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        loadPlayer();
      };
    } else {
      loadPlayer();
    }

    return () => {
      stopProgressInterval();
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);
  
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function' && playerRef.current.getPlaybackRate() !== playbackRate) {
      playerRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  return <div id={playerDivId} className="w-full h-full"></div>;
});

export default YouTubePlayerView;
