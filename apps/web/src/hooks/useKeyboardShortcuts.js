import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function useKeyboardShortcuts(options) {
  const navigate = useNavigate();
  const onSearchOpen = options?.onSearchOpen;

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Cmd+K opens search modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onSearchOpen?.();
        return;
      }

      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'Escape') {
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onSearchOpen]);
}
