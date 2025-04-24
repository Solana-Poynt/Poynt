import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
  ActivityIndicator,
  Image,
  ScrollView,
  BackHandler,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Video from 'react-native-video';
import { Adtype, Campaign } from '~/store/api/api';
import { useCampaignActions, useCampaignInteractions } from '~/hooks/useCampaignActions';
import { getDataFromAsyncStorage } from '~/utils/localStorage';

const { height } = Dimensions.get('window');

interface CampaignDetailsModalProps {
  visible: boolean;
  campaign?: Campaign;
  onViewTask: () => void;
  onClose: () => void;
}

const CampaignDetailsModal: React.FC<CampaignDetailsModalProps> = ({
  visible,
  campaign,
  onViewTask,
  onClose,
}) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(true);
  const slideAnimation = useRef(new Animated.Value(height)).current;
  const { toggleJoin } = useCampaignActions();
  const { isParticipated, isPendingParticipation } = campaign
    ? useCampaignInteractions(campaign.id)
    : { isParticipated: false, isPendingParticipation: false };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible && !isAnimating) {
        handleClose();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [visible, isAnimating]);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id = await getDataFromAsyncStorage('id');
        setUserId(id);
      } catch (error) {
        console.error(error);
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (visible) {
      setIsAnimating(true);
      setIsVideoPaused(false);
      slideAnimation.setValue(height);
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsAnimating(false));
    } else {
      setIsVideoPaused(true);
    }
    return () => {
      slideAnimation.stopAnimation();
    };
  }, [visible, slideAnimation]);

  const handleClose = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsVideoPaused(true);
    Animated.timing(slideAnimation, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsAnimating(false);
      onClose();
    });
  }, [slideAnimation, isAnimating, onClose]);

  const handleJoin = useCallback(() => {
    if (!userId || !campaign || isPendingParticipation) return;
    toggleJoin(userId, campaign.id, isParticipated);
    onViewTask();
  }, [userId, campaign, isPendingParticipation, toggleJoin, isParticipated, onViewTask]);

  if (!campaign) {
    return null;
  }

  const renderMedia = () => {
    if (!campaign.mediaUrl) return null;
    if (campaign.adType === Adtype.DISPLAY_ADS) {
      return (
        <Image
          source={{ uri: campaign.mediaUrl }}
          style={styles.detailsThumbnail}
          resizeMode="cover"
          onError={(error) => console.error(error)}
        />
      );
    }
    if (campaign.adType === Adtype.VIDEO_ADS) {
      return (
        <Video
          source={{ uri: campaign.mediaUrl }}
          style={styles.detailsThumbnail}
          resizeMode="cover"
          paused={isVideoPaused}
          muted
          ignoreSilentSwitch="ignore"
          playInBackground={false}
          onError={(error) => console.error(error)}
          onLoad={() => setIsVideoPaused(false)}
        />
      );
    }
    return null;
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <Animated.View
          style={[styles.detailsPanelContent, { transform: [{ translateY: slideAnimation }] }]}>
          <View style={styles.modalHandle} />
          <View style={styles.fixedHeaderContainer}>
            <View style={styles.detailsPanelHeader}>
              <Text style={styles.detailsPanelTitle}>Campaign Details</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {renderMedia()}
            <Text style={styles.detailsCampaignName}>{campaign.name || 'Unnamed Campaign'}</Text>
            <View style={styles.detailsBusinessBadge}>
              <Ionicons name="business" size={16} color="#666" />
              <Text style={styles.detailsBusinessName}>
                {campaign.business?.name || 'Campaign Sponsor'}
              </Text>
            </View>
            <View style={styles.detailsStatsRow}>
              <View style={styles.detailsStatItem}>
                <Ionicons name="trophy" size={22} color="#F44336" />
                <Text style={styles.detailsStatValue}>{campaign.poyntReward || 100}</Text>
                <Text style={styles.detailsStatLabel}>Poynt Reward</Text>
              </View>
              <View style={styles.detailsStatItem}>
                <Ionicons name="people" size={22} color="#2196F3" />
                <Text style={styles.detailsStatValue}>{campaign.participantsCount || 0}</Text>
                <Text style={styles.detailsStatLabel}>Participants</Text>
              </View>
              <View style={styles.detailsStatItem}>
                <Ionicons name="heart" size={22} color="#F44336" />
                <Text style={styles.detailsStatValue}>{campaign.likersCount || 0}</Text>
                <Text style={styles.detailsStatLabel}>Likes</Text>
              </View>
            </View>
          </View>
          <View style={styles.scrollContainer}>
            <View style={styles.detailsDescriptionSection}>
              <Text style={styles.detailsDescription}>
                {campaign.description || 'No description available'}
              </Text>
              <Text style={styles.detailsInfo}>
                <Text style={styles.detailsInfoLabel}>Status: </Text>
                {campaign.campaignStatus || 'Unknown'}
              </Text>
            </View>
            <View style={styles.bottomPadding} />
          </View>
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={isParticipated ? styles.startCampaignButtonJoined : styles.startCampaignButton}
              onPress={isParticipated ? onViewTask : handleJoin}
              disabled={isPendingParticipation}>
              {isPendingParticipation ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.startCampaignText}>
                  {isParticipated ? 'View Tasks' : 'Join Campaign'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    alignSelf: 'center',
    marginVertical: 5,
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
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsThumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginVertical: 12,
  },
  detailsCampaignName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
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
    marginVertical: 6,
  },
  detailsStatLabel: {
    fontSize: 12,
    color: '#777777',
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
    marginBottom: 16,
  },
  detailsInfo: {
    fontSize: 14,
    color: '#333333',
  },
  detailsInfoLabel: {
    fontWeight: '600',
  },
  bottomPadding: {
    height: 70,
  },
  actionButtonContainer: {
    padding: 20,
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
  },
});

export default CampaignDetailsModal;
