import { router, Stack } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  ImageBackground,
  Animated,
  Dimensions,
  StatusBar,
  Modal,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { campaignData, Campaign, Task } from '../../../components/data/campaignData';
// Import react-native-video instead of expo-av
import Video from 'react-native-video';

const { height, width } = Dimensions.get('window');

// Interface for user progress state
interface UserProgress {
  [campaignIndex: number]: {
    completedTasks: number[];
  };
}

// Interface for video playback state
interface VideoPlaybackState {
  [key: number]: boolean;
}

const Home: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [taskPanelVisible, setTaskPanelVisible] = useState<boolean>(false);
  const [detailsPanelVisible, setDetailsPanelVisible] = useState<boolean>(false);
  const [userProgress, setUserProgress] = useState<UserProgress>({});
  const [expandedDescription, setExpandedDescription] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(12543);
  const [isLiked, setIsLiked] = useState<boolean>(false);

  // State to track paused videos
  const [videoPaused, setVideoPaused] = useState<VideoPlaybackState>({});
  // State to track if controls should be shown
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);

  const slideAnimation = useRef<Animated.Value>(new Animated.Value(height)).current;
  const detailsAnimation = useRef<Animated.Value>(new Animated.Value(height)).current;

  // References for videos
  const videoRefs = useRef<{ [key: number]: any }>({});

  // Clean up videos when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup logic for video resources
      videoRefs.current = {};
    };
  }, []);

  // Effect to handle current video playback
  useEffect(() => {
    const newPausedState = { ...videoPaused };
    // Logic to ensure we play only the current video
    Object.keys(videoRefs.current).forEach((key) => {
      const index = Number(key);
      newPausedState[index] = index !== currentIndex;
    });
    setVideoPaused(newPausedState);
  }, [currentIndex]);

  // Handle video play/pause toggle
  const toggleVideoPlayback = (index: number) => {
    setControlsVisible(true);
    setVideoPaused((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));

    // Auto-hide controls after 2 seconds
    setTimeout(() => {
      setControlsVisible(false);
    }, 2000);
  };

  // Handle task panel slide up/down
  const toggleTaskPanel = (): void => {
    if (taskPanelVisible) {
      // Slide down
      Animated.timing(slideAnimation, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setTaskPanelVisible(false));
    } else {
      // Slide up
      setTaskPanelVisible(true);
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // Handle details panel slide up/down
  const toggleDetailsPanel = (): void => {
    if (detailsPanelVisible) {
      // Slide down
      Animated.timing(detailsAnimation, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setDetailsPanelVisible(false));
    } else {
      // Slide up
      setDetailsPanelVisible(true);
      Animated.timing(detailsAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // Function to handle like button press
  const handleLikePress = (): void => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  // Function to navigate to external actions
  const handleTaskAction = (task: Task): void => {
    console.log(`Navigate to: ${task.url} for task: ${task.description}`);
    // Here you would implement deep linking to the required app/website
    // For example: Linking.openURL(task.url);

    // For the MVP, we'll just simulate task completion
    const newProgress: UserProgress = { ...userProgress };
    if (!newProgress[currentIndex]) {
      newProgress[currentIndex] = { completedTasks: [] };
    }

    if (!newProgress[currentIndex].completedTasks.includes(task.id)) {
      newProgress[currentIndex].completedTasks.push(task.id);
      setUserProgress(newProgress);
    }

    // Close the task panel
    toggleTaskPanel();
  };

  // Function to get task completion status
  const isTaskCompleted = (taskId: number): boolean => {
    return userProgress[currentIndex]?.completedTasks?.includes(taskId) || false;
  };

  // Function to get campaign completion count
  const getCompletionCount = (index: number): number => {
    if (!userProgress[index] || !userProgress[index].completedTasks) {
      return 0;
    }
    return userProgress[index].completedTasks.length;
  };

  // Handle when a new campaign is in view
  const handleViewableItemsChanged = React.useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0) {
        const newIndex = viewableItems[0].index;
        setCurrentIndex(newIndex);
      }
    },
    []
  );

  // Render each campaign item
  const renderCampaignItem = ({
    item,
    index,
  }: ListRenderItemInfo<Campaign>): React.ReactElement => {
    const isCompleted = getCompletionCount(index) === item.tasks.length;
    const progress = getCompletionCount(index);
    const totalTasks = item.tasks.length;

    // Check if the campaign has a video instead of an image
    const isVideo = item.mediaType === 'video';

    // Check if this video is paused
    const isPaused = videoPaused[index] === true;

    return (
      <View style={styles.campaignContainer}>
        {isVideo ? (
          // Video background using react-native-video
          <View style={styles.videoContainer}>
            <TouchableWithoutFeedback onPress={() => toggleVideoPlayback(index)}>
              <View style={styles.videoWrapper}>
                <Video
                  ref={(ref) => {
                    videoRefs.current[index] = ref;
                  }}
                  source={{ uri: item.videoUrl }}
                  style={styles.videoBackground}
                  resizeMode={'cover'}
                  repeat={true}
                  paused={isPaused}
                  muted={false}
                  onError={(e) => console.log('Video error:', e)}
                  onLoad={() => console.log(`Video ${index} loaded`)}
                  rate={1.0}
                  playInBackground={false}
                  playWhenInactive={false}
                />

                {/* Play/Pause Button Overlay (visible when video is paused or controls are shown) */}
                {(isPaused || controlsVisible) && (
                  <View style={styles.playButtonOverlay}>
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={() => toggleVideoPlayback(index)}>
                      <Ionicons name={isPaused ? 'play' : 'pause'} size={40} color="white" />
                    </TouchableOpacity>
                  </View>
                )}

                <LinearGradient
                  colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
                  style={styles.overlay}
                />

                {/* Campaign content */}
                <SafeAreaView style={styles.contentContainer}>
                  {/* Top section - Business info and search/filter - Spotify style */}
                  <View style={styles.headerContainer}>
                    <TouchableOpacity
                      style={styles.spotifyLogoContainer}
                      onPress={toggleDetailsPanel}>
                      <Text style={styles.spotifyText}>{item.businessName}</Text>
                      <Ionicons name="information-circle" size={18} color="white" />
                    </TouchableOpacity>

                    <View style={styles.searchFilterContainer}>
                      <TouchableOpacity style={styles.searchButton}>
                        <Ionicons name="search" size={22} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.menuButton}>
                        <Ionicons name="menu" size={22} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Bottom section - Campaign details */}
                  <View style={styles.bottomSection}>
                    <Text style={styles.campaignName}>{item.campaignName}</Text>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setExpandedDescription(!expandedDescription)}
                      style={styles.descriptionContainer}>
                      <Text
                        style={styles.campaignDescription}
                        numberOfLines={expandedDescription ? undefined : 2}>
                        {item.description}
                        {!expandedDescription && item.description.length > 90 && (
                          <Text style={styles.moreText}> ... more</Text>
                        )}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Side actions */}
                  <View style={styles.sideActionsContainer}>
                    <TouchableOpacity style={styles.sideActionButton} onPress={toggleTaskPanel}>
                      <View style={styles.trophyContainer}>
                        <Ionicons
                          name={isCompleted ? 'trophy' : 'trophy-outline'}
                          size={28}
                          color={isCompleted ? '#A71919' : 'white'}
                        />
                        <View style={styles.progressCircle}>
                          {[...Array(totalTasks)].map((_, i) => (
                            <View
                              key={i}
                              style={[
                                styles.progressDot,
                                i < progress ? styles.progressDotCompleted : {},
                              ]}
                            />
                          ))}
                        </View>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.sideActionButton} onPress={handleLikePress}>
                      <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={28}
                        color={isLiked ? '#A71919' : 'white'}
                      />
                      <Text style={styles.sideActionText}>{likeCount}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.sideActionButton}>
                      <Ionicons name="share-social-outline" size={28} color="white" />
                      <Text style={styles.sideActionText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        ) : (
          // Image background
          <ImageBackground source={{ uri: item.imageUrl }} style={styles.campaignBackground}>
            {/* Semi-transparent overlay for better text readability */}
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
              style={styles.overlay}
            />

            {/* Campaign content */}
            <SafeAreaView style={styles.contentContainer}>
              {/* Top section - Business info and search/filter - Spotify style */}
              <View style={styles.headerContainer}>
                <TouchableOpacity style={styles.spotifyLogoContainer} onPress={toggleDetailsPanel}>
                  <Text style={styles.spotifyText}>{item.businessName}</Text>
                  <Ionicons name="information-circle" size={18} color="white" />
                </TouchableOpacity>

                <View style={styles.searchFilterContainer}>
                  <TouchableOpacity style={styles.searchButton}>
                    <Ionicons name="search" size={22} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuButton}>
                    <Ionicons name="menu" size={22} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bottom section - Campaign details */}
              <View style={styles.bottomSection}>
                <Text style={styles.campaignName}>{item.campaignName}</Text>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setExpandedDescription(!expandedDescription)}
                  style={styles.descriptionContainer}>
                  <Text
                    style={styles.campaignDescription}
                    numberOfLines={expandedDescription ? undefined : 2}>
                    {item.description}
                    {!expandedDescription && item.description.length > 90 && (
                      <Text style={styles.moreText}> ... more</Text>
                    )}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Side actions */}
              <View style={styles.sideActionsContainer}>
                <TouchableOpacity style={styles.sideActionButton} onPress={toggleTaskPanel}>
                  <View style={styles.trophyContainer}>
                    <Ionicons
                      name={isCompleted ? 'trophy' : 'trophy-outline'}
                      size={28}
                      color={isCompleted ? '#A71919' : 'white'}
                    />
                    <View style={styles.progressCircle}>
                      {[...Array(totalTasks)].map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.progressDot,
                            i < progress ? styles.progressDotCompleted : {},
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sideActionButton} onPress={handleLikePress}>
                  <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={28}
                    color={isLiked ? '#A71919' : 'white'}
                  />
                  <Text style={styles.sideActionText}>{likeCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sideActionButton}>
                  <Ionicons name="share-social-outline" size={28} color="white" />
                  <Text style={styles.sideActionText}>Share</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </ImageBackground>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {/* Main campaign feed */}
      <View style={styles.container}>
        <FlatList
          data={campaignData}
          renderItem={renderCampaignItem}
          keyExtractor={(item) => item.id.toString()}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.y / height);
            setCurrentIndex(newIndex);
          }}
        />
      </View>

      {/* Tasks Panel Modal */}
      {taskPanelVisible && (
        <Modal
          transparent={true}
          visible={taskPanelVisible}
          animationType="none"
          onRequestClose={toggleTaskPanel}>
          <Animated.View
            style={[styles.taskPanelContainer, { transform: [{ translateY: slideAnimation }] }]}>
            <View style={styles.taskPanelContent}>
              <View style={styles.taskPanelHeader}>
                <Text style={styles.taskPanelTitle}>Campaign Tasks</Text>
                <TouchableOpacity onPress={toggleTaskPanel}>
                  <Ionicons name="close-circle" size={28} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.tasksList}>
                {campaignData[currentIndex]?.tasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={[
                      styles.taskItem,
                      isTaskCompleted(task.id) ? styles.taskItemCompleted : {},
                    ]}
                    onPress={() => handleTaskAction(task)}
                    disabled={isTaskCompleted(task.id)}>
                    <View style={styles.taskIconWrapper}>
                      {isTaskCompleted(task.id) ? (
                        <Ionicons name="checkmark-circle" size={24} color="#00C853" />
                      ) : (
                        <View style={styles.taskIcon}>
                          <Text style={styles.taskIconText}>{task.id}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.taskInfo}>
                      <Text style={styles.taskTitle}>{task.description}</Text>
                      <Text style={styles.taskPoints}>+{task.points} points</Text>
                    </View>

                    <Ionicons
                      name={isTaskCompleted(task.id) ? 'checkmark' : 'arrow-forward'}
                      size={24}
                      color={isTaskCompleted(task.id) ? '#00C853' : '#B71C1C'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.totalPoints}>
                <Text style={styles.totalPointsText}>
                  Total: {campaignData[currentIndex]?.points} points
                </Text>
              </View>
            </View>
          </Animated.View>
        </Modal>
      )}

      {/* Details Panel Modal */}
      {detailsPanelVisible && (
        <Modal
          transparent={true}
          visible={detailsPanelVisible}
          animationType="none"
          onRequestClose={toggleDetailsPanel}>
          <Animated.View
            style={[
              styles.detailsPanelContainer,
              { transform: [{ translateY: detailsAnimation }] },
            ]}>
            <View style={styles.detailsPanelContent}>
              <View style={styles.detailsPanelHeader}>
                <Text style={styles.detailsPanelTitle}>Campaign Details</Text>
                <TouchableOpacity onPress={toggleDetailsPanel}>
                  <Ionicons name="close-circle" size={28} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.detailsContent}>
                <Text style={styles.detailsCampaignName}>
                  {campaignData[currentIndex]?.campaignName}
                </Text>
                <Text style={styles.detailsBusinessName}>
                  by {campaignData[currentIndex]?.businessName}
                </Text>

                <View style={styles.detailsInfoRow}>
                  <View style={styles.detailsInfoItem}>
                    <Ionicons name="calendar" size={20} color="#666" />
                    <Text style={styles.detailsInfoText}>
                      Ends: {campaignData[currentIndex]?.endDate}
                    </Text>
                  </View>

                  <View style={styles.detailsInfoItem}>
                    <Ionicons name="people" size={20} color="#666" />
                    <Text style={styles.detailsInfoText}>
                      {campaignData[currentIndex]?.totalParticipants} participants
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsInfoRow}>
                  <View style={styles.detailsInfoItem}>
                    <Ionicons name="trophy" size={20} color="#666" />
                    <Text style={styles.detailsInfoText}>
                      {campaignData[currentIndex]?.points} points
                    </Text>
                  </View>

                  <View style={styles.detailsInfoItem}>
                    <Ionicons name="pricetag" size={20} color="#666" />
                    <Text style={styles.detailsInfoText}>
                      {campaignData[currentIndex]?.category}
                    </Text>
                  </View>
                </View>

                <Text style={styles.detailsDescription}>
                  {campaignData[currentIndex]?.description}
                </Text>

                <View style={styles.detailsTasksPreview}>
                  <Text style={styles.detailsTasksTitle}>Tasks:</Text>
                  {campaignData[currentIndex]?.tasks.map((task) => (
                    <View key={task.id} style={styles.detailsTaskItem}>
                      <Text style={styles.detailsTaskText}>• {task.description}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.startCampaignButton}
                  onPress={() => {
                    toggleDetailsPanel();
                    toggleTaskPanel();
                  }}>
                  <Text style={styles.startCampaignText}>Start Campaign</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  campaignContainer: {
    width: width,
    height: height,
  },
  campaignBackground: {
    flex: 1,
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1, // Keep overlay above video but below controls
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 2, // Keep content above overlay
  },

  videoContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  videoWrapper: {
    flex: 1,
    position: 'relative',
  },
  videoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: width,
    height: height,
    backgroundColor: '#000',
  },
  // Play button overlay
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3, // Above overlay but below content
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  spotifyLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 30,
  },
  spotifyText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
  },
  searchFilterContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  searchButton: {
    marginRight: 15,
  },
  menuButton: {},

  bottomSection: {
    marginBottom: 50,
    width: '80%',
  },
  campaignName: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  campaignDescription: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 2,
  },
  moreText: {
    color: '#e0e0e0',
    fontWeight: '500',
    fontSize: 15,
  },
  // Spotify-style side action buttons
  sideActionsContainer: {
    position: 'absolute',
    right: 16,
    top: '57%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 4,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 4, // Keep above all other elements
  },
  sideActionButton: {
    alignItems: 'center',
    marginBottom: 30,
  },
  spotifyActionButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  sideActionText: {
    color: 'white',
    fontSize: 12,
  },
  likeCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  taskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignSelf: 'flex-start',
  },
  taskButtonCompleted: {
    backgroundColor: 'rgba(0, 200, 83, 0.3)',
  },
  taskIconContainer: {
    marginRight: 8,
  },
  taskButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trophyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 52,
    height: 52,
  },
  progressCircle: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: 4,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 2,
  },
  progressDotCompleted: {
    backgroundColor: '#A71919',
  },
  filterOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 24,
    width: 100,
    padding: 4,
    position: 'absolute',
    top: 68,
    right: 24,
    zIndex: 10,
  },
  sliderContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  sliderItem: {
    width: 24,
    height: 24,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 3,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    height: '100%',
    width: '50%',
    backgroundColor: 'white',
    borderRadius: 1.5,
  },
  sliderKnob: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'white',
    top: -5.5,
    left: '50%',
    marginLeft: -7,
  },
  statusBadge: {
    position: 'absolute',
    top: 100,
    right: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskPanelContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  taskPanelContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: height * 0.7,
  },
  taskPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  taskPanelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  tasksList: {
    marginVertical: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  taskItemCompleted: {
    backgroundColor: '#E8F5E9',
  },
  taskIconWrapper: {
    marginRight: 16,
  },
  taskIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#B71C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIconText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  taskPoints: {
    fontSize: 14,
    color: '#B71C1C',
    fontWeight: 'bold',
  },
  totalPoints: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  totalPointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B71C1C',
  },
  detailsPanelContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailsPanelContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: height * 0.8,
  },
  detailsPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  detailsPanelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  detailsContent: {
    paddingVertical: 16,
  },
  detailsCampaignName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  detailsBusinessName: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  detailsInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailsInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  detailsInfoText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
  detailsDescription: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    marginVertical: 16,
  },
  detailsTasksPreview: {
    marginVertical: 16,
  },
  detailsTasksTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  detailsTaskItem: {
    marginBottom: 8,
  },
  detailsTaskText: {
    fontSize: 16,
    color: '#333333',
  },
  startCampaignButton: {
    backgroundColor: '#B71C1C',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 16,
  },
  startCampaignText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Home;
