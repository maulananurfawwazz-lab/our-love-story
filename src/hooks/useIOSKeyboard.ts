// ═══════════════════════════════════════════════════════════════
// useIOSKeyboard – iOS Visual Viewport keyboard detection
// ═══════════════════════════════════════════════════════════════
// On iOS Safari/PWA, the keyboard does NOT resize the layout viewport.
// Instead it resizes the VISUAL viewport. We use the VisualViewport API
// to detect keyboard height and expose it as a CSS custom property so
// the chat input bar can position itself above the keyboard.
//
// Why: iOS PWA treats the keyboard as an overlay. Without this,
// the input bar gets hidden behind the keyboard or the page shows
// a large empty gap.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';

export interface IOSKeyboardState {
  /** Current keyboard height in px (0 when closed) */
  keyboardHeight: number;
  /** Whether the keyboard is currently visible */
  isOpen: boolean;
}

export function useIOSKeyboard(): IOSKeyboardState {
  const [state, setState] = useState<IOSKeyboardState>({
    keyboardHeight: 0,
    isOpen: false,
  });
  const rafId = useRef<number>(0);

  const update = useCallback(() => {
    // Cancel any pending frame to batch rapid-fire events
    if (rafId.current) cancelAnimationFrame(rafId.current);

    rafId.current = requestAnimationFrame(() => {
      const vv = window.visualViewport;
      if (!vv) return;

      // The keyboard height = full window height minus the visual viewport height
      // minus the offset from top (scroll position within the viewport).
      // On iOS PWA, window.innerHeight stays the same when keyboard opens,
      // but visualViewport.height shrinks.
      const fullHeight = window.innerHeight;
      const visibleHeight = vv.height;
      const offset = vv.offsetTop;

      // Keyboard height is the difference, but only if it's significant
      // (> 100px to avoid false positives from address bar changes)
      const kbHeight = Math.max(0, fullHeight - visibleHeight - offset);
      const isOpen = kbHeight > 100;

      setState(prev => {
        if (prev.keyboardHeight === kbHeight && prev.isOpen === isOpen) return prev;
        return { keyboardHeight: isOpen ? kbHeight : 0, isOpen };
      });

      // Also set a CSS custom property on :root for CSS-only consumers
      document.documentElement.style.setProperty(
        '--kb-height',
        `${isOpen ? kbHeight : 0}px`
      );
    });
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    // Initial check
    update();

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      document.documentElement.style.removeProperty('--kb-height');
    };
  }, [update]);

  return state;
}
