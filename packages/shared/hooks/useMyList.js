import { useState, useEffect, useCallback } from 'react';
import myList from '../utils/myList';

export default function useMyList(item, type) {
  const [inList, setInList] = useState(false);

  const itemKey = item ? `${item.type || item._detectedType || type || 'movie'}:${item.id || item.tmdb_id || ''}` : '';

  const refresh = useCallback(() => {
    if (!item) return;
    let alive = true;
    myList.isInList(item, type).then((result) => {
      if (alive) setInList(result);
    });
    return () => {
      alive = false;
    };
  }, [item, type]);

  useEffect(() => {
    const cleanup = refresh();
    const unsubscribe = myList.subscribe(() => {
      refresh();
    });
    return () => {
      if (typeof cleanup === 'function') cleanup();
      unsubscribe();
    };
    // itemKey ensures effect re-runs when the targeted item changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKey]);

  const toggle = useCallback(async () => {
    if (!item) return;
    await myList.toggle(item, type);
  }, [item, type]);

  return { inList, toggle };
}

export function useMyListItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const data = await myList.getAll();
      if (alive) {
        setItems(data);
        setLoading(false);
      }
    };
    load();
    const unsubscribe = myList.subscribe(load);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return { items, loading };
}
