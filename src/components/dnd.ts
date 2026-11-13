import { useState } from 'react';

/** Minimal HTML5 drag-and-drop reordering for a list. */
export function useDragReorder(onMove: (from: number, to: number) => void, group: string) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const itemProps = (index: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/x-reorder-' + group, String(index));
      setDragIndex(index);
    },
    onDragOver: (e: React.DragEvent) => {
      if (dragIndex === null || !e.dataTransfer.types.includes('text/x-reorder-' + group)) return;
      e.preventDefault();
      e.stopPropagation();
      if (overIndex !== index) setOverIndex(index);
    },
    onDrop: (e: React.DragEvent) => {
      if (dragIndex === null) return;
      e.preventDefault();
      e.stopPropagation();
      if (dragIndex !== index) onMove(dragIndex, index);
      setDragIndex(null);
      setOverIndex(null);
    },
    onDragEnd: () => {
      setDragIndex(null);
      setOverIndex(null);
    },
    'data-dragging': dragIndex === index || undefined,
    'data-over': (overIndex === index && dragIndex !== index) || undefined,
  });

  return { itemProps, dragIndex, overIndex };
}

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length || from === to) return arr;
  const copy = [...arr];
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}
