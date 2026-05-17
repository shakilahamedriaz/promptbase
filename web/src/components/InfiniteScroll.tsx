import { useEffect, useRef, useCallback } from 'react';

interface InfiniteScrollProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  threshold?: number;
}

export function InfiniteScroll({
  onLoadMore,
  isLoading,
  hasMore,
  threshold = 200,
}: InfiniteScrollProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && !isLoading && hasMore) {
        onLoadMore();
      }
    },
    [isLoading, hasMore, onLoadMore]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: `${threshold}px`,
    });

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [handleIntersection, threshold]);

  return (
    <div ref={observerTarget} className="flex justify-center py-8">
      {isLoading && (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-brand-600 animate-bounce" />
          <div className="h-2 w-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="h-2 w-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      )}
    </div>
  );
}
