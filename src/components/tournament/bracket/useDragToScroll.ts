import { useEffect, useRef } from 'react';

export function useDragToScroll(scrollRef: React.RefObject<HTMLElement | null>) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const scrollLeft = useRef(0);
  const scrollTop = useRef(0);
  const hasMoved = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      // Only left mouse button
      if (e.button !== 0) return;
      isDragging.current = true;
      hasMoved.current = false;
      startX.current = e.pageX;
      startY.current = e.pageY;
      scrollLeft.current = el.scrollLeft;
      scrollTop.current = el.scrollTop;
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.pageX - startX.current;
      const dy = e.pageY - startY.current;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved.current = true;
      }
      el.scrollLeft = scrollLeft.current - dx;
      el.scrollTop = scrollTop.current - dy;
    };

    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      el.style.cursor = 'grab';
      el.style.removeProperty('user-select');
    };

    // Prevent click events when dragging
    const onClick = (e: MouseEvent) => {
      if (hasMoved.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    el.style.cursor = 'grab';
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('click', onClick, true);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('click', onClick, true);
    };
  }, [scrollRef]);
}
