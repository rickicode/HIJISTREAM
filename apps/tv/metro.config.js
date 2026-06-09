const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force Metro to resolve react-native (and all its sub-paths) to the version in apps/tv/node_modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native' || moduleName.startsWith('react-native/')) {
    const localRNPath = path.resolve(projectRoot, 'node_modules/react-native');
    const targetPath = moduleName === 'react-native'
      ? localRNPath
      : path.join(localRNPath, moduleName.substring('react-native/'.length));
    return context.resolveRequest(
      context,
      targetPath,
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
