// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*'],
  globals: {
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
  },
};
