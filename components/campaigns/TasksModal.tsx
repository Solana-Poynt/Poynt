import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { formatTaskDescription } from '~/utils/TaskFormatter';

const { height } = Dimensions.get('window');

interface Task {
  id: number;
  description: string;
  points: number;
  url: string;
}

interface TasksModalProps {
  visible: boolean;
  campaign: any;
  animation: Animated.Value;
  onClose: () => void;
  onTaskAction: (task: Task) => void;
  currentIndex: number;
  userProgress: {
    [key: number]: {
      completedTasks: number[];
    };
  };
}

const TasksModal: React.FC<TasksModalProps> = ({
  visible,
  campaign,
  animation,
  onClose,
  onTaskAction,
  currentIndex,
  userProgress,
}) => {
  if (!campaign) return null;

  const isTaskCompleted = (taskId: number): boolean => {
    return userProgress[currentIndex]?.completedTasks?.includes(taskId) || false;
  };

  const reward = campaign.poyntReward || 1;

  const poyntSplit = (poyntReward: number) => {
    return poyntReward / 3;
  };

  return (
    <Modal transparent={true} visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[styles.taskPanelContent, { transform: [{ translateY: animation }] }]}>
              <View style={styles.modalHandle} />
              <View style={styles.taskPanelHeader}>
                <Text style={styles.taskPanelTitle}>Campaign Tasks</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.tasksList}>
                {campaign.tasks && typeof campaign.tasks === 'object'
                  ? Object.entries(campaign.tasks).map(([key, value], index) => {
                      const taskId = index + 1;
                      const { icon, title, details } = formatTaskDescription(key, value as string);

                      return (
                        <TouchableOpacity
                          key={taskId}
                          style={[
                            styles.taskItem,
                            isTaskCompleted(taskId) ? styles.taskItemCompleted : {},
                          ]}
                          onPress={() =>
                            onTaskAction({
                              id: taskId,
                              description: title,
                              points: 20,
                              url: value as string,
                            })
                          }
                          disabled={isTaskCompleted(taskId)}>
                          <View style={styles.taskIconWrapper}>
                            {isTaskCompleted(taskId) ? (
                              <Ionicons name="checkmark-circle" size={24} color="#00C853" />
                            ) : (
                              <View style={styles.taskIcon}>
                                <Ionicons name={icon} size={16} color="white" />
                              </View>
                            )}
                          </View>

                          <View style={styles.taskInfo}>
                            <Text style={styles.taskTitle}>{title}</Text>
                            <Text style={styles.taskDescription} numberOfLines={2}>
                              {details}
                            </Text>
                            <Text style={styles.taskPoints}>{poyntSplit(reward)} Poynts</Text>
                          </View>

                          <Ionicons
                            name={isTaskCompleted(taskId) ? 'checkmark' : 'arrow-forward'}
                            size={24}
                            color={isTaskCompleted(taskId) ? '#00C853' : '#B71C1C'}
                          />
                        </TouchableOpacity>
                      );
                    })
                  : null}
              </View>

              <View style={styles.totalPoints}>
                <Text style={styles.totalPointsText}>
                  Total: {campaign.poyntReward || 100} poynts
                </Text>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

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
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskPanelTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333333',
    letterSpacing: 0.3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskItemCompleted: {
    backgroundColor: '#f1f8e9',
    borderLeftColor: '#4caf50',
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
});

export default TasksModal;
