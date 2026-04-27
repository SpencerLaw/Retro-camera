import { RefObject, useEffect, useRef } from 'react';

export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handlePointerDown = (e: PointerEvent) => {
      // Only handle primary pointer (usually left click)
      if (e.button !== 0) return;

      // DO NOT intercept native touch scrolling! Native touch is always better.
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        return;
      }

      // Do not intercept drags on interactive elements that need native handling
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'BUTTON', 'A', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      // Do not intercept if the container is not actually scrollable
      if (Math.abs(el.scrollHeight - el.clientHeight) <= 1) {
        return;
      }

      isDragging.current = true;
      hasDragged.current = false;
      startY.current = e.clientY;
      startScrollTop.current = el.scrollTop;

      el.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none'; // Prevent text selection across the document while dragging

      // Prevent parent scroll containers from also starting a drag
      e.stopPropagation();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      const dy = e.clientY - startY.current;

      if (Math.abs(dy) > 4) {
        hasDragged.current = true;
      }

      if (hasDragged.current) {
        if (e.cancelable) {
          e.preventDefault();
        }
        el.scrollTop = startScrollTop.current - dy;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;

      el.style.cursor = '';
      document.body.style.userSelect = '';

      setTimeout(() => {
        hasDragged.current = false;
      }, 50);
    };

    const handleClick = (e: MouseEvent) => {
      if (hasDragged.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Attach down to element, but move and up to window so drag continues outside element bounds
    el.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('click', handleClick, { capture: true });

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('click', handleClick, { capture: true });
    };
  }, [ref]);
}
