import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Modal,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Campaign } from '~/store/api/api';
import Video from 'react-native-video';
import { formatTaskDescription } from '~/utils/TaskFormatter';

const { height, width } = Dimensions.get('window');

interface CampaignDetailsModalProps {
  visible: boolean;
  campaign: Campaign;
  animation: Animated.Value;
  hasJoined: boolean;
  currentIndex: number;
  onClose: () => void;
  onJoin: () => void;
}

const CampaignDetailsModal: React.FC<CampaignDetailsModalProps> = ({
  visible,
  campaign,
  animation,
  hasJoined,
  currentIndex,
  onClose,
  onJoin,
}) => {
  const [videoError, setVideoError] = useState(false);
  const [selectedTab, setSelectedTab] = useState('about');
  const scrollViewRef = useRef<ScrollView>(null);

  // Reset scroll position when tab changes
  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  if (!campaign) return null;

  return (
    <Modal transparent={true} visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[styles.detailsPanelContent, { transform: [{ translateY: animation }] }]}>
          <View style={styles.modalHandle} />

          {/* Fixed Header */}
          <View style={styles.fixedHeaderContainer}>
            <View style={styles.detailsPanelHeader}>
              <Text style={styles.detailsPanelTitle}>Campaign Details</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Media Preview */}
            {campaign.mediaUrl && (
              <View style={styles.detailsMediaPreview}>
                {campaign.adType === 'video_ads' && !videoError ? (
                  <Video
                    source={{ uri: campaign.mediaUrl }}
                    style={styles.videoThumbnail}
                    resizeMode="contain"
                    paused={false}
                    repeat={true}
                    muted={true}
                    onError={() => setVideoError(true)}
                    rate={1.0}
                    volume={0}
                  />
                ) : (
                  <Image
                    source={{ uri: campaign.mediaUrl }}
                    style={styles.detailsThumbnail}
                    resizeMode="cover"
                  />
                )}
              </View>
            )}

            {/* Campaign Name and Business Badge */}
            <Text style={styles.detailsCampaignName}>{campaign.name}</Text>

            <View style={styles.detailsBusinessBadge}>
              <Ionicons name="business" size={16} color="#666" />
              <Text style={styles.detailsBusinessName}>
                {campaign.business?.name || 'Campaign Sponsor'}
              </Text>
            </View>

            {/* Stats Row */}
            <View style={styles.detailsStatsRow}>
              <View style={styles.detailsStatItem}>
                <Ionicons name="trophy" size={22} color="#ffc107" />
                <Text style={styles.detailsStatValue}>{campaign.poyntReward || 100} Poynts</Text>
                <Text style={styles.detailsStatLabel}>Reward</Text>
              </View>

              <View style={styles.detailsStatItem}>
                <Ionicons name="people" size={22} color="#2196F3" />
                <Text style={styles.detailsStatValue}>{campaign.participants?.length || 0}</Text>
                <Text style={styles.detailsStatLabel}>Participants</Text>
              </View>

              <View style={styles.detailsStatItem}>
                <Ionicons name="heart" size={22} color="#F44336" />
                <Text style={styles.detailsStatValue}>{campaign.likers?.length || 0}</Text>
                <Text style={styles.detailsStatLabel}>Likes</Text>
              </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, selectedTab === 'about' && styles.activeTabButton]}
                onPress={() => handleTabChange('about')}>
                <Text style={[styles.tabText, selectedTab === 'about' && styles.activeTabText]}>
                  About
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, selectedTab === 'tasks' && styles.activeTabButton]}
                onPress={() => handleTabChange('tasks')}>
                <Text style={[styles.tabText, selectedTab === 'tasks' && styles.activeTabText]}>
                  Tasks
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Scrollable Content Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={true}
            overScrollMode="always">
            {/* Tab Content */}
            {selectedTab === 'about' ? (
              <View style={styles.detailsDescriptionSection}>
                <Text style={styles.detailsDescription}>{campaign.description}</Text>
              </View>
            ) : (
              <View style={styles.detailsTasksSection}>
                {campaign.tasks && typeof campaign.tasks === 'object' ? (
                  Object.entries(campaign.tasks).map(([key, value], index) => {
                    const { icon, title, details } = formatTaskDescription(key, value as string);
                    return (
                      <View key={index} style={styles.detailsTaskCard}>
                        <View style={styles.detailsTaskIconContainer}>
                          <Ionicons name={icon} size={22} color="#B71C1C" />
                        </View>
                        <View style={styles.detailsTaskContent}>
                          <Text style={styles.detailsTaskTitle}>{title}</Text>
                          <Text style={styles.detailsTaskText}>{details}</Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.noTasksText}>No tasks available for this campaign</Text>
                )}
              </View>
            )}

            {/* Add padding to ensure content doesn't hide behind the button */}
            <View style={styles.bottomPadding} />
          </ScrollView>

          {/* Fixed Button at Bottom */}
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={hasJoined ? styles.startCampaignButtonJoined : styles.startCampaignButton}
              onPress={onJoin}>
              <Text style={styles.startCampaignText}>
                {hasJoined ? 'View Tasks' : 'Join Campaign'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
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
    marginTop: 5,
    marginBottom: 5,
  },
  detailsPanelContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.9,
    maxHeight: height * 0.93,
  },
  fixedHeaderContainer: {
    paddingHorizontal: 20,
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
  detailsMediaPreview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  detailsCampaignName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  detailsBusinessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  detailsBusinessName: {
    fontSize: 15,
    color: '#555555',
    fontWeight: '500',
    letterSpacing: 0.2,
    marginLeft: 6,
  },
  detailsStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  detailsStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailsStatValue: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 2,
  },
  detailsStatLabel: {
    fontSize: 12,
    color: '#777777',
    fontWeight: '400',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#B71C1C',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#777777',
  },
  activeTabText: {
    color: '#B71C1C',
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 16,
  },
  detailsDescriptionSection: {
    marginBottom: 20,
  },
  detailsDescription: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
    letterSpacing: 0.2,
    fontWeight: '400',
  },
  detailsTasksSection: {
    marginBottom: 24,
  },
  detailsTaskCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  detailsTaskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailsTaskContent: {
    flex: 1,
  },
  detailsTaskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  detailsTaskText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  noTasksText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  bottomPadding: {
    height: 70,
  },
  actionButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  startCampaignButton: {
    backgroundColor: '#B71C1C',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  startCampaignButtonJoined: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  startCampaignText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default CampaignDetailsModal;
