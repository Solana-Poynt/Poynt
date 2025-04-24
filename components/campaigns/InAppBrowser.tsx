import React, { useState, useEffect } from 'react';
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
  const [webViewUrl, setWebViewUrl] = useState('');

  // Set the URL when visible changes or URL changes
  useEffect(() => {
    if (visible && url) {
      setWebViewUrl(url);
      console.log('Opening browser with URL:', url);
    }
  }, [visible, url]);

  // Don't render anything if no URL or not visible
  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
      presentationStyle="fullScreen">
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

        {webViewUrl ? (
          <WebView
            source={{ uri: webViewUrl }}
            style={styles.webview}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onLoadProgress={({ nativeEvent }) => {
              setProgress(nativeEvent.progress);
            }}
            onNavigationStateChange={(navState) => {
              setTitle(navState.title || '');
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit
            onError={(error) => console.error('WebView error:', error)}
          />
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Invalid URL or loading error</Text>
          </View>
        )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#666',
    fontSize: 16,
  },
});

export default InAppBrowser;
