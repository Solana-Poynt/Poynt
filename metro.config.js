const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Override the getAssetData function that's causing the error
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
  resolver: {
    // This helps prevent the "getImageSize is not a function" error
    assetExts: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
  },
});

// Add all possible asset extensions to be sure
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ttf', 'otf', 'mp4', 'mp3', 'wav'
];

module.exports = config;