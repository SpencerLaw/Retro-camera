import { RefObject, useEffect, useRef } from 'react';

export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handlePointerDown = (e: PointerEvent) => {
      // Only handle primary pointer (usually left click or first touch)
      if (e.button !== 0) return;
      // Don't drag if clicking on an interactive element
      if ((e.target as HTMLElement).closest('button, input, textarea, a, select')) return;

      isDragging.current = true;
      startY.current = e.clientY;
      startScrollTop.current = el.scrollTop;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      // Prevent default to stop text selection/native drag if it happens to trigger
      e.preventDefault();
      const dy = e.clientY - startY.current;
      el.scrollTop = startScrollTop.current - dy;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      el.releasePointerCapture(e.pointerId);
      el.style.cursor = '';
      el.style.userSelect = '';
    };

    // Use passive: false for move so we can preventDefault
    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove, { passive: false });
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerUp);

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [ref]);
}
