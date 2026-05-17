import { useEffect, useCallback } from 'react';

interface KeyboardNavigationConfig {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}

export function useKeyboardNavigation(config: KeyboardNavigationConfig) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          config.onEscape?.();
          break;
        case 'Enter':
          event.preventDefault();
          config.onEnter?.();
          break;
        case 'ArrowUp':
          event.preventDefault();
          config.onArrowUp?.();
          break;
        case 'ArrowDown':
          event.preventDefault();
          config.onArrowDown?.();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          config.onArrowLeft?.();
          break;
        case 'ArrowRight':
          event.preventDefault();
          config.onArrowRight?.();
          break;
        default:
          break;
      }
    },
    [config]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useFocusTrap(isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        // Implement focus trap logic
        const focusableElements = document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            event.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
}
