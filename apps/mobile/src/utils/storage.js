import AsyncStorage from '@react-native-async-storage/async-storage';

const storage = {
  async getItem(key) {
    try {
      const item = await AsyncStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  },

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Storage unavailable
    }
  },

  async clear() {
    try {
      await AsyncStorage.clear();
    } catch {
      // Storage unavailable
    }
  },

  async getAllKeys() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys];
    } catch {
      return [];
    }
  },
};

export default storage;
