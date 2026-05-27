const storage = {
  getItem(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  },

  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage unavailable
    }
  },

  clear() {
    try {
      localStorage.clear();
    } catch {
      // Storage unavailable
    }
  },

  getAllKeys() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
      }
      return keys;
    } catch {
      return [];
    }
  },
};

export default storage;
