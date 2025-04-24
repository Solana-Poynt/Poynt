import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import Video from 'react-native-video';
import { Dimensions } from 'react-native';

const { height, width } = Dimensions.get('window');

interface VideoPlayerProps {
  uri: string;
  paused: boolean;
  index: number;
  onRef: (ref: any, index: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ uri, paused, index, onRef }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<any>(null);

  // Use effect to properly manage video state based on visibility
  useEffect(() => {
    if (videoRef.current) {
      if (paused) {
        // Ensure video is definitely paused when not visible
        videoRef.current.seek(0);
      }
    }
  }, [paused]);

  const handleError = (error: any) => {
    const errorMessage = error.error?.message || 'Unknown error';
    setIsLoading(false);
    setError(errorMessage);
  };

  const handleLoad = (meta: any) => {
    setIsLoading(false);
    setError(null);
  };

  const handleBuffer = (meta: { isBuffering: boolean }) => {
    setIsLoading(meta.isBuffering);
  };

  return (
    <View style={styles.videoContainer}>
      {uri ? (
        <>
          <Video
            ref={(ref) => {
              videoRef.current = ref;
              onRef(ref, index);
            }}
            source={{ uri }}
            style={styles.videoBackground}
            resizeMode="contain"
            repeat={true}
            paused={paused} // This controls playback based on visibility
            muted={false}
            onError={handleError}
            onLoad={handleLoad}
            onBuffer={handleBuffer}
            rate={1.0}
            volume={1.0}
            ignoreSilentSwitch="ignore"
            playInBackground={false}
            playWhenInactive={false}
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFF" />
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          )}
          {error && (
            <View style={styles.errorOverlay}>
              <Text style={styles.errorText}>Failed to load video: {error}</Text>
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
};

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
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
