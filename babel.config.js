module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Make sure each plugin is properly formatted
      'react-native-reanimated/plugin'
    ]
  };
};