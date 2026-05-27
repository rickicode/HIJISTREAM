import { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';
import TVFocusable from './TVFocusable';

const { clearTimeout, setTimeout } = global;

export default function SearchBar({ onSearch, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
  };

  return (
    <View style={styles.container}>
      <Search color="#9CA3AF" size={20} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search movies and TV shows..."
        placeholderTextColor="#6B7280"
        returnKeyType="search"
        autoCorrect={false}
      />
      {query.length > 0 && (
        <TVFocusable onPress={handleClear} style={styles.clearButton}>
          <X color="#9CA3AF" size={18} />
        </TVFocusable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    height: '100%',
  },
  clearButton: {
    minWidth: 36,
    minHeight: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
  },
});
