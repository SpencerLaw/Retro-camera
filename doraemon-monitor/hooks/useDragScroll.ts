import { RefObject, useEffect, useRef } from 'react';

export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);
  const targetEl = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const handlePointerDown = (e: PointerEvent) => {
      // Only handle primary pointer (usually left click or first touch)
      if (e.button !== 0) return;

      // Find the nearest scrollable element from the event target, up to the container
      let el = e.target as HTMLElement | null;
      let scrollableEl: HTMLElement | null = null;
      
      while (el && el !== container.parentElement) {
        // Do not intercept drags on range inputs (sliders)
        if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'range') {
          return;
        }

        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
          scrollableEl = el;
          break;
        }
        
        el = el.parentElement;
      }

      // Fallback to container if we didn't find a scrollable child but the container itself is scrollable
      if (!scrollableEl && container.scrollHeight > container.clientHeight) {
        scrollableEl = container;
      }

      if (!scrollableEl) return;

      isDragging.current = true;
      hasDragged.current = false;
      targetEl.current = scrollableEl;
      startY.current = e.clientY;
      startScrollTop.current = scrollableEl.scrollTop;
      
      try {
        scrollableEl.setPointerCapture(e.pointerId);
      } catch (err) {
        // Ignore setPointerCapture errors on some elements
      }
      scrollableEl.style.cursor = 'grabbing';
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current || !targetEl.current) return;
      
      const dy = e.clientY - startY.current;
      
      // Only consider it a drag if moved more than 4 pixels
      if (Math.abs(dy) > 4) {
        hasDragged.current = true;
      }

      if (hasDragged.current) {
        // Prevent default to stop text selection/native drag
        if (e.cancelable) {
          e.preventDefault();
        }
        targetEl.current.scrollTop = startScrollTop.current - dy;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging.current || !targetEl.current) return;
      isDragging.current = false;
      
      try {
        targetEl.current.releasePointerCapture(e.pointerId);
      } catch (err) {}
      
      targetEl.current.style.cursor = '';
      targetEl.current = null;
      
      // Note: hasDragged is intentionally NOT reset here so handleClick can read it
      // It will be reset on the next handlePointerDown.
      // However, we need a timeout to reset it so subsequent clicks aren't blocked forever.
      setTimeout(() => {
        hasDragged.current = false;
      }, 50);
    };

    // Intercept click events that happen immediately after a drag
    const handleClick = (e: MouseEvent) => {
      if (hasDragged.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove, { passive: false });
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);
    
    // Use capture phase for click to stop it before it reaches the button
    container.addEventListener('click', handleClick, { capture: true });

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerUp);
      container.removeEventListener('click', handleClick, { capture: true });
    };
  }, [ref]);
}
