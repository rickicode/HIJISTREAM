import { useState, useEffect, useCallback, useRef } from 'react';
import myList from '../utils/myList';

export default function useMyList(item, type) {
  const [inList, setInList] = useState(false);
  const [loading, setLoading] = useState(true);
  const aliveRef = useRef(true);

  const itemKey = item ? `${item.type || item._detectedType || type || 'movie'}:${item.id || item.tmdb_id || ''}` : '';

  const refresh = useCallback(() => {
    if (!item) return;
    aliveRef.current = true;
    myList.isInList(item, type).then((result) => {
      if (aliveRef.current) {
        setInList(result);
        setLoading(false);
      }
    });
  }, [item, type]);

  useEffect(() => {
    setLoading(true);
    aliveRef.current = true;
    refresh();
    
    const unsubscribe = myList.subscribe(() => {
      refresh();
    });
    
    return () => {
      aliveRef.current = false;
      unsubscribe();
    };
  }, [itemKey, refresh]);

  const toggle = useCallback(async () => {
    if (!item) return;
    await myList.toggle(item, type);
  }, [item, type]);

  return { inList, toggle, loading };
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
