import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, TouchableOpacity, Text } from 'react-native';
import Video from 'react-native-video';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Dimensions } from 'react-native';

const { height, width } = Dimensions.get('window');

interface VideoPlayerProps {
  uri: string;
  paused: boolean;
  index: number;
  onRef: (ref: any, index: number) => void;
  onTogglePlayback: (index: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  uri,
  paused,
  index,
  onRef,
  onTogglePlayback,
}) => {
  const [controlsVisible, setControlsVisible] = useState(false);
  const [videoAspect, setVideoAspect] = useState(16 / 9);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (controlsVisible && !paused) {
      timer = setTimeout(() => {
        setControlsVisible(false);
      }, 2000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [controlsVisible, paused]);

  const handlePress = () => {
    setControlsVisible(true);
    onTogglePlayback(index);
  };

  return (
    <View style={styles.videoContainer}>
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={styles.videoWrapper}>
          {uri ? (
            <Video
              ref={(ref) => onRef(ref, index)}
              source={{ uri }}
              style={styles.videoBackground}
              resizeMode={'contain'}
              playWhenInactive={false}
              repeat={true}
              paused={paused}
              muted={false}
              onError={() => {}}
              onLoad={(data) => {
                if (data.naturalSize) {
                  const { width, height } = data.naturalSize;
                  setVideoAspect(width / height);
                }
              }}
              rate={1.0}
              volume={1.0}
              ignoreSilentSwitch="ignore"
              playInBackground={false}
            />
          ) : (
            <View style={[styles.videoBackground, { backgroundColor: '#111' }]}>
              <Text style={styles.loadingText}>Media not available</Text>
            </View>
          )}

          {(paused || controlsVisible) && (
            <View style={styles.playButtonOverlay}>
              <TouchableOpacity style={styles.playButton} onPress={() => onTogglePlayback(index)}>
                <Ionicons name={paused ? 'play' : 'pause'} size={40} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    height: height,
    width: width,
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoBackground: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
  },
});

export default VideoPlayer;
