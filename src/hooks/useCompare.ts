import { useState, useCallback } from 'react';

export function useCompare() {
  const [selected, setSelected] = useState<number[]>([]);

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= 2) return [prev[1], id]; // replace oldest
      return [...prev, id];
    });
  }, []);

  const clear = useCallback(() => setSelected([]), []);

  const isSelected = useCallback((id: number) => selected.includes(id), [selected]);

  return { selected, toggle, clear, isSelected, isReady: selected.length === 2 };
}
