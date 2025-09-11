const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  
  // Add support for .cjs files (Firebase uses these)
  config.resolver.sourceExts.push('cjs');
  
  // Disable package.json exports (causes conflicts)
  config.resolver.unstable_enablePackageExports = false;
  
  return config;
})();
