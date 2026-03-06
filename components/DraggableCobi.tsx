import React, { useState, useRef, useCallback, useEffect } from 'react';

interface DraggableCobiProps {
  onClick: () => void;
  icon: string;
  themeColor: string; // hex color for border and shadow ring
  cobiVisible: boolean;
  ariaLabel?: string;
  useWhiteBg?: boolean; // When true, keep white background instead of colored (e.g. PowerOfVerbs)
}

const DraggableCobi: React.FC<DraggableCobiProps> = ({ onClick, icon, themeColor, cobiVisible, ariaLabel = 'Chatear con Cobi', useWhiteBg = false }) => {
  const [position, setPosition] = useState({ x: -1, y: -1 }); // -1 means default position
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    isDragging.current = true;
    hasMoved.current = false;
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      initialPos.current = { x: rect.left, y: rect.top };
    }
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !isMobile) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartPos.current.x;
    const dy = touch.clientY - dragStartPos.current.y;

    // Only start drag if moved more than 5px (avoid accidental drags on tap)
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMoved.current = true;
    }

    if (hasMoved.current) {
      e.preventDefault();
      const newX = Math.max(0, Math.min(window.innerWidth - 56, initialPos.current.x + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 56, initialPos.current.y + dy));
      setPosition({ x: newX, y: newY });
    }
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!hasMoved.current && isDragging.current) {
      onClick();
    }
    isDragging.current = false;
  }, [onClick]);

  const handleClick = useCallback(() => {
    if (!isMobile) {
      onClick();
    }
    // On mobile, click is handled via touchEnd (no-drag)
  }, [isMobile, onClick]);

  const positionStyle: React.CSSProperties = position.x >= 0 && isMobile
    ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
    : { right: '1.25rem', bottom: '1.25rem' };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`lg:hidden fixed z-[60] w-14 h-14 rounded-full flex items-center justify-center text-2xl active:scale-95 transition-transform cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}
      style={{
        ...positionStyle,
        backgroundColor: useWhiteBg ? '#FFFFFF' : themeColor,
        border: `2px solid ${themeColor}`,
        color: useWhiteBg ? undefined : '#FFFFFF',
        boxShadow: `0 8px 16px rgba(0,0,0,0.25)`,
        touchAction: 'none',
      }}
      aria-label={ariaLabel}
    >
      {icon}
    </button>
  );
};

export default DraggableCobi;
