import { clsx } from 'clsx';

interface SkeletonProps {
  width?: string;
  height?: string;
  count?: number;
  className?: string;
  circle?: boolean;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  count = 1,
  className,
  circle = false,
}: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'bg-gray-200 animate-pulse',
            circle && 'rounded-full',
            !circle && 'rounded-md',
            className
          )}
          style={{ width, height }}
          role="status"
          aria-label="Loading..."
        />
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-white p-4 space-y-4">
      <Skeleton height="1.5rem" width="80%" />
      <Skeleton height="1rem" width="100%" count={2} />
      <Skeleton height="2rem" width="40%" />
    </div>
  );
}
