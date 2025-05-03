import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  formatTaskDescription,
  mapTaskType,
  getTaskVerificationInstructions,
} from '~/utils/TaskFormatter';
import useTwitterAuth from '~/utils/config/twitterservice';
import { useFundPoyntMutation, useAddTasksDoneMutation } from '~/store/api/api';
import Notification from '~/components/Notification';
import { Campaign } from '~/store/api/api';
import { saveJSONToAsyncStorage } from '~/utils/localStorage';
import { Linking } from 'react-native';
import { router } from 'expo-router';

const { height, width } = Dimensions.get('window');

interface Task {
  id: number;
  key: string;
  taskType: string;
  description: string;
  points: number;
  url: string;
}

interface UserProgress {
  [campaignId: string]: {
    completedTasks: number[];
    attemptedTasks: number[];
    proofUrls: Record<number, string>;
    hasCompletedCampaign?: boolean;
  };
}

interface TasksModalProps {
  visible: boolean;
  campaign?: Campaign;
  onClose: () => void;
  userProgress: UserProgress;
  setUserProgress: React.Dispatch<React.SetStateAction<UserProgress>>;
  userId: string | null;
  openInAppBrowser: (url: string) => void;
  xConnected: boolean;
}

const USER_TASK_PROGRESS_KEY = 'userTaskProgress';

const TasksModal: React.FC<TasksModalProps> = ({
  visible,
  campaign,
  onClose,
  userProgress,
  setUserProgress,
  userId,
  xConnected,
  openInAppBrowser,
}) => {
  const [attemptedTasks, setAttemptedTasks] = useState<number[]>([]);
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);
  const [notification, setNotification] = useState({ show: false, message: '', status: '' });
  const [isAnimating, setIsAnimating] = useState(false);
  const slideAnimation = useRef(new Animated.Value(height)).current;
  const { verifyTask, loading } = useTwitterAuth();
  const [fundPoynt] = useFundPoyntMutation();
  const [addTasksDone] = useAddTasksDoneMutation();
  const [showTwitterModal, setShowTwitterModal] = useState<boolean>(!xConnected);
  const [proofInputVisible, setProofInputVisible] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [currentVerifyingTask, setCurrentVerifyingTask] = useState<Task | null>(null);
  const [taskProofUrls, setTaskProofUrls] = useState<Record<number, string>>({});

  const convertToTwitterDeeplink = (url: string) => {
    if (!url.includes('twitter.com') && !url.includes('x.com')) {
      return null; // Not a Twitter URL
    }

    let twitterDeeplink = '';

    try {
      // Parse the URL to extract relevant information
      if (url.includes('/status/')) {
        // It's a tweet
        const tweetId = url.split('/status/')[1].split(/[?#]/)[0];
        twitterDeeplink = `twitter://status?id=${tweetId}`;
      } else if (url.includes('/hashtag/')) {
        // It's a hashtag
        const hashtag = url.split('/hashtag/')[1].split(/[?#]/)[0];
        twitterDeeplink = `twitter://search?query=%23${hashtag}`;
      } else {
        // It's likely a profile
        const pathParts = url.split('.com/')[1]?.split('/')[0];
        if (pathParts) {
          twitterDeeplink = `twitter://user?screen_name=${pathParts}`;
        }
      }

      return twitterDeeplink || null;
    } catch (error) {
      console.log('Error parsing Twitter URL:', error);
      return null;
    }
  };

  // Initialize state from userProgress when campaign changes
  useEffect(() => {
    if (!campaign || !userProgress[campaign.id]) return;

    setCompletedTasks(userProgress[campaign.id]?.completedTasks || []);
    setAttemptedTasks(userProgress[campaign.id]?.attemptedTasks || []);
    setTaskProofUrls(userProgress[campaign.id]?.proofUrls || {});
  }, [campaign, userProgress]);

  // Handle modal animation
  useEffect(() => {
    if (visible) {
      setIsAnimating(true);
      slideAnimation.setValue(height);
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsAnimating(false);
        }
      });
      setShowTwitterModal(!xConnected);
    }
  }, [visible, xConnected, slideAnimation]);

  const handleClose = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    Animated.timing(slideAnimation, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsAnimating(false);
        onClose();
      }
    });
  }, [slideAnimation, isAnimating, onClose]);

  const showNotification = useCallback((message: string, status: string) => {
    setNotification({ show: true, message, status });
    setTimeout(() => setNotification({ show: false, message: '', status: '' }), 3000);
  }, []);

  const navigateToProfile = useCallback(() => {
    handleClose();
    setTimeout(() => {
      router.push('/screens/profile');
    }, 300);
  }, [handleClose]);

  const saveProofUrl = useCallback(
    async (taskId: number, url: string) => {
      if (!campaign) return;

      const newProofUrls = { ...taskProofUrls, [taskId]: url };
      setTaskProofUrls(newProofUrls);

      const newProgress = {
        ...userProgress,
        [campaign.id]: {
          ...userProgress[campaign.id],
          proofUrls: newProofUrls,
        },
      };
      setUserProgress(newProgress);
      await saveJSONToAsyncStorage(USER_TASK_PROGRESS_KEY, newProgress);
    },
    [campaign, taskProofUrls, userProgress, setUserProgress]
  );

  // Now update the handleAttemptTask function
  const handleAttemptTask = useCallback(
    async (task: Task) => {
      if (!campaign || !userId) {
        showNotification('User not authenticated', 'error');
        return;
      }

      if (!xConnected && task.taskType !== 'visit') {
        setShowTwitterModal(true);
        return;
      }

      const newAttemptedTasks = [...new Set([...attemptedTasks, task.id])];
      setAttemptedTasks(newAttemptedTasks);

      const newProgress = {
        ...userProgress,
        [campaign.id]: {
          ...userProgress[campaign.id],
          attemptedTasks: newAttemptedTasks,
          completedTasks: userProgress[campaign.id]?.completedTasks || [],
          proofUrls: userProgress[campaign.id]?.proofUrls || {},
        },
      };
      setUserProgress(newProgress);
      await saveJSONToAsyncStorage(USER_TASK_PROGRESS_KEY, newProgress);

      if (task.url) {
        // Try to use Twitter deeplink if this is a Twitter task
        if (
          task.taskType === 'follow' ||
          task.taskType === 'like' ||
          task.taskType === 'retweet' ||
          task.taskType === 'comment'
        ) {
          const deeplink = convertToTwitterDeeplink(task.url);

          if (deeplink) {
            // Check if we can open the Twitter app
            Linking.canOpenURL(deeplink)
              .then((supported) => {
                if (supported) {
                  // Open in Twitter app
                  return Linking.openURL(deeplink);
                } else {
                  // Fall back to in-app browser
                  openInAppBrowser(task.url);
                  return null;
                }
              })
              .catch((err) => {
                console.log('Error opening Twitter deeplink:', err);
                // Fall back to in-app browser
                openInAppBrowser(task.url);
              });
          } else {
            // Not a Twitter URL or couldn't parse it
            openInAppBrowser(task.url);
          }
        } else {
          // Not a Twitter task, use in-app browser
          openInAppBrowser(task.url);
        }

        // Show proof input when needed
        if (task.taskType !== 'follow' && task.taskType !== 'visit') {
          setTimeout(() => {
            setCurrentVerifyingTask(task);
            setProofUrl(taskProofUrls[task.id] || '');
            setProofInputVisible(true);
          }, 500);
        }
      } else {
        showNotification('No URL provided for this task', 'error');
      }
    },
    [
      campaign,
      userId,
      xConnected,
      attemptedTasks,
      userProgress,
      setUserProgress,
      openInAppBrowser,
      showNotification,
      taskProofUrls,
    ]
  );
  const handleTaskCompletion = useCallback(
    async (task: Task) => {
      if (!campaign || !userId) return;

      const newCompletedTasks = [...new Set([...completedTasks, task.id])];
      setCompletedTasks(newCompletedTasks);

      const newProgress = {
        ...userProgress,
        [campaign.id]: {
          ...userProgress[campaign.id],
          completedTasks: newCompletedTasks,
          attemptedTasks: userProgress[campaign.id]?.attemptedTasks || [],
          proofUrls: userProgress[campaign.id]?.proofUrls || {},
        },
      };

      try {
        await fundPoynt({ userId, poyntValue: task.points }).unwrap();
        showNotification(`Task verified! ${task.points} Poynts awarded.`, 'success');
      } catch (err) {
        showNotification('Task verified, but failed to award Poynts', 'error');
      }

      const totalTasks = campaign.tasks ? Object.keys(campaign.tasks).length : 0;
      if (
        totalTasks > 0 &&
        newCompletedTasks.length === totalTasks &&
        !newProgress[campaign.id]?.hasCompletedCampaign
      ) {
        try {
          await addTasksDone({ campaignId: campaign.id }).unwrap();
          newProgress[campaign.id] = {
            ...newProgress[campaign.id],
            hasCompletedCampaign: true,
          };
          showNotification('All tasks completed! Campaign marked as done.', 'success');
        } catch (error) {
          showNotification('Failed to mark campaign as done', 'error');
        }
      }

      setUserProgress(newProgress);
      await saveJSONToAsyncStorage(USER_TASK_PROGRESS_KEY, newProgress);

      setProofInputVisible(false);
      setProofUrl('');
      setCurrentVerifyingTask(null);
    },
    [
      campaign,
      userId,
      completedTasks,
      userProgress,
      setUserProgress,
      fundPoynt,
      addTasksDone,
      showNotification,
    ]
  );

  const handleVerifyTask = useCallback(
    async (task: Task) => {
      if (!userId) {
        showNotification('User not authenticated', 'error');
        return;
      }

      if (!xConnected && task.taskType !== 'visit') {
        setShowTwitterModal(true);
        return;
      }

      try {
        if (task.taskType === 'visit') {
          await handleTaskCompletion(task);
          return;
        }

        const xAccount = await AsyncStorage.getItem('x_account');
        if (!xAccount) {
          showNotification('Please connect your Twitter account', 'error');
          setShowTwitterModal(true);
          return;
        }

        if (task.taskType !== 'follow') {
          const savedProofUrl = taskProofUrls[task.id];
          if (!savedProofUrl) {
            setCurrentVerifyingTask(task);
            setProofUrl('');
            setProofInputVisible(true);
            return;
          }

          const result = await verifyTask(task.taskType, task.url, savedProofUrl);
          if (result.requiresProof) {
            setCurrentVerifyingTask(task);
            setProofUrl(savedProofUrl);
            setProofInputVisible(true);
            showNotification(result.error || 'Please provide a valid proof URL', 'error');
            return;
          }

          if (result.completed) {
            await handleTaskCompletion(task);
          } else {
            showNotification(result.error || 'Task verification failed', 'error');
          }
        } else {
          const result = await verifyTask(task.taskType, task.url);
          if (result.completed) {
            await handleTaskCompletion(task);
          } else {
            showNotification(result.error || 'Task verification failed', 'error');
          }
        }
      } catch (error) {
        showNotification('Error verifying task', 'error');
      }
    },
    [userId, xConnected, taskProofUrls, verifyTask, showNotification, handleTaskCompletion]
  );

  const cancelProofInput = useCallback(() => {
    setProofInputVisible(false);
    setProofUrl('');
    setCurrentVerifyingTask(null);
  }, []);

  const submitProofUrl = useCallback(() => {
    if (!currentVerifyingTask) return;

    if (!proofUrl.trim()) {
      showNotification('Please provide a valid URL', 'error');
      return;
    }

    try {
      new URL(proofUrl.startsWith('http') ? proofUrl : `https://${proofUrl}`);
    } catch {
      showNotification('Please enter a valid URL', 'error');
      return;
    }

    saveProofUrl(currentVerifyingTask.id, proofUrl);
    setProofInputVisible(false);

    if (
      currentVerifyingTask.taskType === 'follow' ||
      completedTasks.includes(currentVerifyingTask.id)
    ) {
      handleVerifyTask(currentVerifyingTask);
    } else {
      showNotification('Proof URL saved! Click "Verify" when ready.', 'success');
      setCurrentVerifyingTask(null);
    }
  }, [
    currentVerifyingTask,
    proofUrl,
    saveProofUrl,
    handleVerifyTask,
    showNotification,
    completedTasks,
  ]);

  const poyntSplit = useCallback(
    (poyntReward: string | undefined) => Math.round(parseInt(poyntReward || '100', 10) / 3),
    []
  );

  const parseCampaignTasks = useCallback(
    (campaignTasks: Record<string, string> | undefined): Task[] => {
      if (!campaignTasks) return [];

      const points = poyntSplit(campaign?.poyntReward);
      return Object.entries(campaignTasks).map(([key, url], index) => {
        const taskType = mapTaskType(key, url);
        const { title } = formatTaskDescription(taskType, url);

        return {
          id: index + 1,
          key,
          taskType,
          description: title,
          points,
          url,
        };
      });
    },
    [campaign?.poyntReward, poyntSplit]
  );

  const getTaskIcon = useCallback((taskType: string) => {
    switch (taskType) {
      case 'follow':
        return 'person-add-outline';
      case 'like':
        return 'heart-outline';
      case 'comment':
        return 'chatbubble-outline';
      case 'retweet':
        return 'repeat-outline';
      case 'visit':
        return 'open-outline';
      default:
        return 'checkmark-circle-outline';
    }
  }, []);

  const tasks = useMemo(
    () => parseCampaignTasks(campaign?.tasks),
    [campaign?.tasks, parseCampaignTasks]
  );

  const renderTaskItem = useCallback(
    (task: Task) => {
      const isAttempted = attemptedTasks.includes(task.id);
      const isCompleted = completedTasks.includes(task.id);
      const { title, details } = formatTaskDescription(task.taskType, task.url);
      const verificationInstructions = getTaskVerificationInstructions(task.taskType);
      const iconName = getTaskIcon(task.taskType);
      const hasProofUrl = !!taskProofUrls[task.id];
      const needsTwitter = task.taskType !== 'visit';

      return (
        <View key={task.id} style={styles.taskItem}>
          <View style={styles.taskIconWrapper}>
            <View
              style={[styles.taskIcon, isCompleted ? styles.completedIcon : styles.pendingIcon]}>
              <Ionicons name={iconName} size={16} color="white" />
            </View>
          </View>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{title}</Text>
            <Text style={styles.taskDescription} numberOfLines={2}>
              {details}
            </Text>
            <Text style={styles.taskInstructions}>{verificationInstructions}</Text>
            {isAttempted &&
              !isCompleted &&
              task.taskType !== 'follow' &&
              task.taskType !== 'visit' && (
                <Text
                  style={[
                    styles.proofStatus,
                    hasProofUrl ? styles.proofProvided : styles.proofMissing,
                  ]}>
                  {hasProofUrl ? '✓ Proof submitted' : '! Proof required'}
                </Text>
              )}
            {needsTwitter && !xConnected && (
              <Text style={styles.twitterRequired}>Twitter connection required</Text>
            )}
            <Text style={styles.taskPoints}>{task.points} Poynts</Text>
          </View>
          <View style={styles.taskActions}>
            <TouchableOpacity
              style={[
                styles.goToButton,
                !isCompleted && { backgroundColor: '#B71C1C', opacity: isAttempted ? 0.6 : 1 },
                isCompleted && styles.disabledButton,
              ]}
              onPress={() => handleAttemptTask(task)}
              disabled={isCompleted}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.goToButtonText,
                  !isCompleted && { color: 'white' },
                  isCompleted && { color: '#666' },
                ]}>
                {isCompleted ? 'Done' : 'Go'}
              </Text>
            </TouchableOpacity>
            {isAttempted &&
              !isCompleted &&
              task.taskType !== 'follow' &&
              task.taskType !== 'visit' && (
                <TouchableOpacity
                  style={[styles.proofButton, !xConnected && styles.disabledButton]}
                  disabled={!xConnected}
                  onPress={() => {
                    if (!xConnected) {
                      setShowTwitterModal(true);
                      return;
                    }
                    setCurrentVerifyingTask(task);
                    setProofUrl(taskProofUrls[task.id] || '');
                    setProofInputVisible(true);
                  }}>
                  <Text style={styles.proofButtonText}>
                    {hasProofUrl ? 'Edit Proof' : 'Add Proof'}
                  </Text>
                </TouchableOpacity>
              )}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (!isAttempted ||
                  isCompleted ||
                  (task.taskType !== 'follow' && task.taskType !== 'visit' && !hasProofUrl) ||
                  (!xConnected && task.taskType !== 'visit')) &&
                  styles.disabledButton,
              ]}
              disabled={
                !isAttempted ||
                isCompleted ||
                loading ||
                (task.taskType !== 'follow' && task.taskType !== 'visit' && !hasProofUrl) ||
                (!xConnected && task.taskType !== 'visit')
              }
              onPress={() => handleVerifyTask(task)}>
              {loading && currentVerifyingTask?.id === task.id ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.verifyButtonText}>{isCompleted ? 'Verified' : 'Verify'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [
      attemptedTasks,
      completedTasks,
      taskProofUrls,
      xConnected,
      getTaskIcon,
      handleAttemptTask,
      handleVerifyTask,
    ]
  );

  const tasksList = useMemo(() => {
    if (!tasks.length) {
      return (
        <View style={styles.noTasksContainer}>
          <Text style={styles.noTasksText}>No tasks available for this campaign</Text>
        </View>
      );
    }
    return tasks.map(renderTaskItem);
  }, [tasks, renderTaskItem]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[styles.taskPanelContent, { transform: [{ translateY: slideAnimation }] }]}>
            <View style={styles.modalHandle} />
            <View style={styles.taskPanelHeader}>
              <Text style={styles.taskPanelTitle}>Campaign Tasks</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.tasksList}>{tasksList}</ScrollView>
            <View style={styles.totalPoints}>
              <Text style={styles.totalPointsText}>
                Total: {campaign?.poyntReward || 100} Poynts
              </Text>
              {campaign?.tasks &&
                attemptedTasks.length === Object.keys(campaign.tasks).length &&
                Object.keys(campaign.tasks).length > 0 && (
                  <Text style={styles.completeMessage}>
                    {completedTasks.length === Object.keys(campaign.tasks).length
                      ? 'All tasks completed!'
                      : 'All tasks attempted. Verification pending.'}
                  </Text>
                )}
            </View>
            {proofInputVisible && (
              <View style={styles.proofInputContainer}>
                <Text style={styles.proofInputTitle}>
                  Provide your{' '}
                  {currentVerifyingTask?.taskType === 'like'
                    ? 'liked tweet'
                    : currentVerifyingTask?.taskType}{' '}
                  link
                </Text>
                <Text style={styles.proofInstructions}>
                  {currentVerifyingTask?.taskType === 'like'
                    ? 'Copy the URL of the tweet you liked'
                    : currentVerifyingTask?.taskType === 'retweet'
                      ? 'Copy the URL of your retweet'
                      : 'Copy the URL of your comment'}
                </Text>
                <TextInput
                  style={styles.proofInput}
                  placeholder="Paste your URL here"
                  value={proofUrl}
                  onChangeText={setProofUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.proofButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.proofButton, styles.proofCancelButton]}
                    onPress={cancelProofInput}>
                    <Text style={styles.proofCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.proofButton, styles.proofSubmitButton]}
                    onPress={submitProofUrl}>
                    <Text style={styles.proofSubmitButtonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {showTwitterModal && (
              <View style={styles.twitterModalOverlay}>
                <View style={styles.twitterModalContainer}>
                  <View style={styles.twitterModalHeader}>
                    <Text style={styles.twitterModalTitle}>Connect Twitter</Text>
                    <TouchableOpacity
                      style={styles.twitterModalCloseButton}
                      onPress={() => setShowTwitterModal(false)}>
                      <Ionicons name="close" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.twitterModalContent}>
                    <Text style={styles.twitterModalText}>
                      You need to connect your X account to complete this task.
                    </Text>
                    <TouchableOpacity
                      style={styles.connectTwitterButton}
                      onPress={navigateToProfile}>
                      <Text style={styles.connectTwitterButtonText}>Connect X Account </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            {notification.show && (
              <Notification
                status={notification.status}
                message={notification.message}
                switchShowOff={() => setNotification({ show: false, message: '', status: '' })}
              />
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Updated styles with extracted inline styles
const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  taskPanelContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: height * 0.8,
  },
  taskPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  taskPanelTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333333',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tasksList: {
    marginVertical: 16,
    maxHeight: height * 0.5,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f8f8',
    marginBottom: 14,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#B71C1C',
  },
  taskIconWrapper: {
    marginRight: 16,
    marginTop: 2,
  },
  taskIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIcon: {
    backgroundColor: '#B71C1C',
  },
  completedIcon: {
    backgroundColor: '#4CAF50',
  },
  taskInfo: {
    flex: 1,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  taskDescription: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  taskInstructions: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  twitterRequired: {
    fontSize: 12,
    color: '#1DA1F2',
    fontWeight: '500',
    marginBottom: 4,
  },
  proofStatus: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  proofProvided: {
    color: '#4CAF50',
  },
  proofMissing: {
    color: '#FF9800',
  },
  taskPoints: {
    fontSize: 12,
    color: '#B71C1C',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  taskActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  goToButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  goToButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  verifyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#B71C1C',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 65,
  },
  proofButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 65,
  },
  proofButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  totalPoints: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalPointsText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#B71C1C',
    letterSpacing: 0.2,
  },
  completeMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  noTasksContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noTasksText: {
    fontSize: 14,
    color: '#666',
  },
  proofInputContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  proofInputTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  proofInstructions: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  proofInput: {
    height: 44,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#333',
  },
  proofButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  proofCancelButton: {
    backgroundColor: '#f0f0f0',
  },
  proofSubmitButton: {
    backgroundColor: '#B71C1C',
  },
  proofCancelButtonText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  proofSubmitButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  twitterModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  twitterModalContainer: {
    width: width * 0.85,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  twitterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  twitterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  twitterModalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  twitterModalContent: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  twitterLogo: {
    marginBottom: 20,
  },
  twitterModalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  connectTwitterButton: {
    backgroundColor: '#B71C1C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  connectTwitterButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TasksModal;
