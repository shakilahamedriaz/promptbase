import { Link } from 'react-router-dom';
import {
  ChevronRightIcon,
  ArrowDownTrayIcon,
  StarIcon as StarOutline,
  HeartIcon as HeartOutline,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid, HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/Button';
import type { MarketplacePrompt } from '@/hooks/useMarketplace';

export interface PromptCardProps {
  prompt: MarketplacePrompt;
  isImported: boolean;
  isFavorited?: boolean;
  onImport: (id: string) => void;
  onPreview: (prompt: MarketplacePrompt) => void;
  onRate: (id: string, score: number) => void;
  onFavorite?: (id: string) => void;
  userRating?: number | null;
}

function StarRating({ rating, count, onRate, userRating }: { rating: number; count: number; onRate?: (score: number) => void; userRating?: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onRate?.(star)}
            className={clsx('transition-colors', onRate ? 'cursor-pointer' : 'cursor-default')}
            disabled={!onRate}
          >
            {star <= Math.round(rating) ? (
              <StarSolid className={clsx('h-3.5 w-3.5', userRating === star ? 'text-brand-500' : 'text-yellow-400')} />
            ) : (
              <StarOutline className="h-3.5 w-3.5 text-gray-300" />
            )}
          </button>
        ))}
      </div>
      <span className="text-xs text-gray-500">
        {rating.toFixed(1)} ({count})
      </span>
    </div>
  );
}

export function PromptCard({ prompt, isImported, isFavorited, onImport, onPreview, onRate, onFavorite, userRating }: PromptCardProps) {
  return (
    <article
      className="group rounded-lg border bg-white p-4 transition-all duration-150 shadow-sm hover:shadow-md"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">{prompt.title}</h3>
          <button
            onClick={() => onFavorite?.(prompt.id)}
            className="shrink-0 p-1 transition-colors"
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorited ? (
              <HeartSolid className="h-4 w-4 text-red-500" />
            ) : (
              <HeartOutline className="h-4 w-4 text-gray-400 hover:text-red-500" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          by{' '}
          <Link to={`/creators/${prompt.author_id}`} className="font-medium text-brand-600 hover:text-brand-700">
            {prompt.author_name}
          </Link>{' '}
          • {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Description */}
      {prompt.description && (
        <p className="text-xs text-gray-700 line-clamp-2 mb-2 italic">
          {prompt.description}
        </p>
      )}

      {/* Body preview */}
      <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed font-mono">
        {prompt.body}
      </p>

      {/* Tags */}
      {prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {prompt.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              #{tag}
            </span>
          ))}
          {prompt.tags.length > 3 && <span className="text-xs text-gray-500">+{prompt.tags.length - 3}</span>}
        </div>
      )}

      {/* Rating */}
      <div className="mb-3 border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
        <StarRating
          rating={prompt.avg_rating}
          count={prompt.rating_count}
          onRate={(score) => onRate(prompt.id, score)}
          userRating={userRating}
        />
      </div>

      {/* Stats */}
      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span>🔄 {prompt.fork_count} forks</span>
          <span>📊 Score: {prompt.quality_score ?? '-'}</span>
        </div>
        {prompt.price_credits && (
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-800 font-medium">
            ₿ {prompt.price_credits}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          leftIcon={<ArrowDownTrayIcon className="h-3.5 w-3.5" />}
          onClick={() => onImport(prompt.id)}
          disabled={isImported}
        >
          {isImported ? 'Imported' : 'Import'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ChevronRightIcon className="h-3.5 w-3.5" />}
          onClick={() => onPreview(prompt)}
        >
          Preview
        </Button>
      </div>
    </article>
  );
}
