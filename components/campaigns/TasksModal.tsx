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
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatTaskDescription } from '~/utils/TaskFormatter';
import useTwitterAuth from '~/utils/config/twitterservice';
import { useFundPoyntMutation } from '~/store/api/api';
import Notification from '~/components/Notification';
import { Campaign } from '~/store/api/api';
import { saveJSONToAsyncStorage } from '~/utils/localStorage';

const { height } = Dimensions.get('window');

interface Task {
  id: number;
  description: string;
  points: number;
  url?: string;
}

interface UserProgress {
  [campaignId: string]: {
    completedTasks: number[];
  };
}

interface TasksModalProps {
  visible: boolean;
  campaign?: Campaign;
  onClose: () => void;
  userProgress: UserProgress;
  setUserProgress: React.Dispatch<React.SetStateAction<UserProgress>>;
  userId: string | null;
  openInAppBrowser: (url: string) => void; // Added prop to open URLs
}

const USER_TASK_PROGRESS_KEY = 'userTaskProgress';

const TasksModal: React.FC<TasksModalProps> = React.memo(
  ({ visible, campaign, onClose, userProgress, setUserProgress, userId, openInAppBrowser }) => {
    const [attemptedTasks, setAttemptedTasks] = useState<number[]>([]);
    const [completedTasks, setCompletedTasks] = useState<number[]>([]);
    const [notification, setNotification] = useState({ show: false, message: '', status: '' });
    const [isAnimating, setIsAnimating] = useState(false);
    const slideAnimation = useRef(new Animated.Value(height)).current;
    const { verifyTask, loading } = useTwitterAuth();
    const [fundPoynt] = useFundPoyntMutation();

    useEffect(() => {
      if (!campaign || !userProgress[campaign.id]) return;
      setCompletedTasks(userProgress[campaign.id]?.completedTasks || []);
    }, [campaign, userProgress]);

    useEffect(() => {
      if (visible) {
        setIsAnimating(true);
        slideAnimation.setValue(height);
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(({ finished }: any) => {
          if (finished) {
            setIsAnimating(false);
          }
        });
      }
    }, [visible, slideAnimation]);

    const handleClose = useCallback(() => {
      if (isAnimating) return;
      setIsAnimating(true);
      Animated.timing(slideAnimation, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }: any) => {
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

    const handleAttemptTask = useCallback(
      async (task: Task) => {
        if (!campaign || !userId) {
          showNotification('User not authenticated', 'error');
          return;
        }

        // Mark task as attempted
        setAttemptedTasks((prev) => [...new Set([...prev, task.id])]);

        // Update user progress
        const newProgress: UserProgress = { ...userProgress };
        if (!newProgress[campaign.id]) {
          newProgress[campaign.id] = { completedTasks: [] };
        }
        if (!newProgress[campaign.id].completedTasks.includes(task.id)) {
          newProgress[campaign.id].completedTasks.push(task.id);
          setUserProgress(newProgress);
          await saveJSONToAsyncStorage(USER_TASK_PROGRESS_KEY, newProgress);
        }

        // Open Twitter URL in InAppBrowser
        if (task.url) {
          const cleanUrl = task.url.replace(/^(follow|retweet|comment|like|tweet)\s*:/i, '').trim();
          openInAppBrowser(cleanUrl);
        }
      },
      [campaign, userId, userProgress, setUserProgress, openInAppBrowser, showNotification]
    );

    const handleVerifyTask = useCallback(
      async (taskId: number, taskType: string, url: string, points: number) => {
        if (!userId) {
          showNotification('User not authenticated', 'error');
          return;
        }

        const xAccount = await AsyncStorage.getItem('x_account');
        if (!xAccount) {
          showNotification('Please connect your Twitter account', 'error');
          return;
        }

        const cleanUrl = url.replace(/^(follow|retweet|comment|like|tweet)\s*:/i, '').trim();
        const result = await verifyTask(taskType as any, cleanUrl);

        if (result.completed) {
          setCompletedTasks((prev) => [...new Set([...prev, taskId])]);
          try {
            await fundPoynt({ userId, poyntValue: points }).unwrap();
            showNotification(`Task verified! ${points} Poynts awarded.`, 'success');
          } catch (err) {
            showNotification('Task verified, but failed to award Poynts', 'error');
          }
        } else {
          showNotification(result.error || 'Task not completed', 'error');
        }
      },
      [userId, verifyTask, fundPoynt, showNotification]
    );

    const poyntSplit = useCallback(
      (poyntReward: string) => Math.round(parseInt(poyntReward, 10) / 3),
      []
    );

    const handleNoTasks = useCallback(
      () => (
        <View style={styles.noTasksContainer}>
          <Text style={styles.noTasksText}>No tasks available</Text>
        </View>
      ),
      []
    );

    const renderTaskItem = useCallback(
      (key: string, value: string, index: number) => {
        const taskId = index + 1;
        const { icon, title, details } = formatTaskDescription(key, value);
        const isAttempted = attemptedTasks.includes(taskId);
        const isCompleted = completedTasks.includes(taskId);
        const points = poyntSplit(campaign?.poyntReward || '100');
        const taskType = title.toLowerCase().split(' ')[0];
        const cleanUrl = value.replace(/^(follow|retweet|comment|like|tweet)\s*:/i, '').trim();

        return (
          <View key={taskId} style={styles.taskItem}>
            <View style={styles.taskIconWrapper}>
              <View style={styles.taskIcon}>
                <Ionicons name={'alert'} size={16} color="white" />
              </View>
            </View>
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle}>{title}</Text>
              <Text style={styles.taskDescription} numberOfLines={2}>
                {details}
              </Text>
              <Text style={styles.taskPoints}>{points} Poynts</Text>
            </View>
            <View style={styles.taskActions}>
              <TouchableOpacity
                style={[
                  styles.goToButton,
                  !isCompleted && { backgroundColor: '#B71C1C', opacity: isAttempted ? 0.6 : 1 },
                  isCompleted && styles.disabledButton,
                ]}
                onPress={() =>
                  handleAttemptTask({
                    id: taskId,
                    description: title,
                    points,
                    url: cleanUrl,
                  })
                }
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
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  (!isAttempted || isCompleted) && styles.disabledButton,
                ]}
                disabled={!isAttempted || isCompleted || loading}
                onPress={() => handleVerifyTask(taskId, taskType, cleanUrl, points)}>
                {loading ? (
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
        campaign,
        poyntSplit,
        handleAttemptTask,
        handleVerifyTask,
        loading,
      ]
    );

    const tasksList = useMemo(() => {
      if (!campaign || !campaign.tasks || typeof campaign.tasks !== 'object') {
        return handleNoTasks();
      }
      return Object.entries(campaign.tasks).map(([key, value], index) =>
        renderTaskItem(key, value as string, index)
      );
    }, [campaign, handleNoTasks, renderTaskItem]);

    if (!visible) return null;

    return (
      <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
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
            <View style={styles.tasksList}>{tasksList}</View>
            <View style={styles.totalPoints}>
              <Text style={styles.totalPointsText}>
                Total: {campaign?.poyntReward || 100} Poynts
              </Text>
              {campaign?.tasks &&
                attemptedTasks.length === Object.keys(campaign.tasks).length &&
                Object.keys(campaign.tasks).length > 0 && (
                  <Text style={styles.completeMessage}>
                    {completedTasks.length === attemptedTasks.length
                      ? 'All tasks completed!'
                      : 'All tasks attempted. Verification pending.'}
                  </Text>
                )}
            </View>
            {notification.show && (
              <Notification
                status={notification.status}
                message={notification.message}
                switchShowOff={() => setNotification({ show: false, message: '', status: '' })}
              />
            )}
          </Animated.View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
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
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    marginBottom: 14,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#B71C1C',
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
    padding: 16,
  },
  noTasksText: {
    fontSize: 14,
    color: '#666',
  },
});

export default TasksModal;
