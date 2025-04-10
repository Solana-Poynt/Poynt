import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';

interface InAppBrowserProps {
  url: string;
  visible: boolean;
  onClose: () => void;
}

const InAppBrowser: React.FC<InAppBrowserProps> = ({ url, visible, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState('');

  if (!url) return null;

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.titleText}>
            {loading ? 'Loading...' : title}
          </Text>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        {loading && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
          </View>
        )}

        {/* Loading indicator */}
        {loading && (
          <ActivityIndicator style={styles.loadingIndicator} size="large" color="#B71C1C" />
        )}

        <WebView
          source={{ uri: url }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onLoadProgress={({ nativeEvent }) => {
            setProgress(nativeEvent.progress);
          }}
          onNavigationStateChange={(navState) => {
            setTitle(navState.title || '');
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    paddingHorizontal: 8,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
  },
  titleText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginHorizontal: 12,
  },
  progressContainer: {
    height: 3,
    width: '100%',
    backgroundColor: '#f0f0f0',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#B71C1C',
  },
  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    zIndex: 10,
  },
  webview: {
    flex: 1,
  },
});

export default InAppBrowser;
