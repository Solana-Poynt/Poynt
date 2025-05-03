import React, { useState, useEffect, useRef, memo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { Dimensions } from 'react-native';

const { height, width } = Dimensions.get('window');

interface VideoPlayerProps {
  uri: string;
  paused: boolean;
  index: number;
  onRef: (ref: VideoRef | null, index: number) => void;
  isVisible?: boolean;
  isNext?: boolean;
  isPreloading?: boolean;
  markVideoReady?: () => void; // Add this prop
}

const VideoPlayer: React.FC<VideoPlayerProps> = memo(
  ({
    uri,
    paused,
    index,
    onRef,
    isVisible = false,
    isNext = false,
    isPreloading = false,
    markVideoReady,
  }) => {
    // State
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [readyToPlay, setReadyToPlay] = useState(false);

    // Refs
    const videoRef = useRef<VideoRef | null>(null);
    const isMountedRef = useRef(true);
    const retryCount = useRef(0);
    const lastUriRef = useRef<string | null>(null);
    const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
    const MAX_RETRIES = 3;

    // Determine if we should actually pause based on visibility and preloading status
    const effectivePaused = paused || (!isVisible && !isPreloading);

    // Determine if we should preload the video but keep it muted
    const shouldPreload = isPreloading || isNext;
    const isMuted = !isVisible || (!isVisible && shouldPreload);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        isMountedRef.current = false;

        // Clear any pending retry timers
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }

        // Release video resources
        if (videoRef.current) {
          videoRef.current = null;
        }
      };
    }, []);

    // Reset state when URI changes
    useEffect(() => {
      if (uri !== lastUriRef.current) {
        setIsLoading(true);
        setError(null);
        setReadyToPlay(false);
        retryCount.current = 0;
        lastUriRef.current = uri;
      }
    }, [uri]);

    // Handle error with enhanced retry mechanism
    const handleError = (error: any) => {
      if (!isMountedRef.current) return;

      const errorMessage = error.error?.message || 'Unknown error';
      console.warn(`Video error (index ${index}):`, errorMessage);
      setIsLoading(false);
      setError(errorMessage);
      setReadyToPlay(false);

      // Clear any existing retry timer
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }

      // Retry mechanism with exponential backoff
      if (retryCount.current < MAX_RETRIES) {
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount.current), 8000);

        retryTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;

          retryCount.current += 1;
          setIsLoading(true);
          setError(null);

          if (videoRef.current) {
            try {
              videoRef.current.seek(0);
            } catch (error) {
              // Silent error
            }
          }
        }, backoffTime);
      }
    };

    // Handle successful load
    const handleLoad = (meta: any) => {
      if (!isMountedRef.current) return;
      setIsLoading(false);
      setError(null);
      setReadyToPlay(true);
      retryCount.current = 0; // Reset retry counter on successful load

      // Mark video as ready in parent component
      if (markVideoReady) {
        markVideoReady();
      }

      // If this is the visible video and it's not paused, ensure it starts playing
      if (isVisible && !paused && videoRef.current) {
        try {
          videoRef.current.seek(0);
        } catch (error) {
          // Silent error
        }
      }
    };

    // Handle ready for display
    const handleReadyForDisplay = () => {
      setReadyToPlay(true);
      // Mark video as ready in parent component
      if (markVideoReady) {
        markVideoReady();
      }
    };

    // Handle buffering state
    const handleBuffer = (meta: { isBuffering: boolean }) => {
      if (!isMountedRef.current) return;
      setIsLoading(meta.isBuffering);
    };

    // Set up video reference
    const setRef = (ref: VideoRef | null) => {
      videoRef.current = ref;
      onRef(ref, index);
    };

    const bufferConfig = {
      minBufferMs: 15000,
      maxBufferMs: 50000,
      bufferForPlaybackMs: 2500,
      bufferForPlaybackAfterRebufferMs: 5000,
    };

    // Handle play/pause based on visibility changes
    useEffect(() => {
      if (!videoRef.current || !readyToPlay) return;

      // When a video becomes visible after being preloaded
      if (isVisible && !effectivePaused) {
        try {
          // Use the proper method to play
          videoRef.current.resume?.();
        } catch (error) {
          // Silent error
        }
      }
      // When a video is no longer visible but we want to keep it preloaded
      else if (!isVisible && shouldPreload) {
        try {
          // Use the proper method to pause
          videoRef.current.pause?.();
        } catch (error) {
          // Silent error
        }
      }
      // When a video is no longer needed (not visible or preloaded)
      else if (!isVisible && !shouldPreload) {
        try {
          videoRef.current.pause?.();
          videoRef.current.seek?.(0);
        } catch (error) {
          // Silent error
        }
      }
    }, [isVisible, effectivePaused, shouldPreload, readyToPlay]);

    return (
      <View style={styles.videoContainer} pointerEvents="none">
        {uri ? (
          <>
            <Video
              ref={setRef}
              source={{ uri, bufferConfig }}
              style={styles.videoBackground}
              resizeMode="contain"
              repeat={true}
              paused={effectivePaused}
              muted={isMuted}
              onError={handleError}
              onLoad={handleLoad}
              onBuffer={handleBuffer}
              rate={1.0}
              volume={1.0}
              ignoreSilentSwitch="ignore"
              playInBackground={false}
              playWhenInactive={false}
              progressUpdateInterval={1000}
              poster={uri}
              controls={false}
              fullscreen={false}
              onReadyForDisplay={handleReadyForDisplay}
              maxBitRate={isVisible ? 5000000 : 2000000}
              preventsDisplaySleepDuringVideoPlayback={isVisible}
            />
            {isLoading && isVisible && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FFF" />
                <Text style={styles.loadingText}>
                  {retryCount.current > 0
                    ? `Retrying (${retryCount.current}/${MAX_RETRIES})...`
                    : ''}
                </Text>
              </View>
            )}
            {error && isVisible && (
              <View style={styles.errorOverlay}>
                <Text style={styles.errorText}>Failed to load video</Text>
              </View>
            )}
          </>
        ) : (
          <View style={[styles.videoBackground, styles.errorContainer]}>
            <Text style={styles.errorText}>Invalid video URL</Text>
          </View>
        )}
      </View>
    );
  },
  // More selective memo comparison to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    // Always re-render when visibility changes
    if (prevProps.isVisible !== nextProps.isVisible) return false;

    // Always re-render when preloading status changes
    if (prevProps.isPreloading !== nextProps.isPreloading) return false;

    // Always re-render when pause state changes
    if (prevProps.paused !== nextProps.paused) return false;

    // Always re-render when URI changes
    if (prevProps.uri !== nextProps.uri) return false;

    // Otherwise, prevent re-renders
    return true;
  }
);

const styles = StyleSheet.create({
  videoContainer: {
    backgroundColor: '#000',
    height,
    width,
    zIndex: 0,
  },
  videoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    padding: 16,
  },
});

export default VideoPlayer;
