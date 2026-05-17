import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  StarIcon as StarOutline,
  XMarkIcon,
  ChevronRightIcon,
  GlobeAltIcon,
  ArrowUpTrayIcon,
  HeartIcon as HeartOutline,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid, HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { EmptyState } from '@/components/EmptyState';
import { useMarketplace, type MarketplacePrompt, type SortOption } from '@/hooks/useMarketplace';
import { ReviewsSection } from './ReviewsSection';
import { VariantsSection } from './VariantsSection';
import { AdvancedFilters } from './AdvancedFilters';
import { PromptCard } from './PromptCard';
import { useAuthStore } from '@/store/authStore';

const CATEGORIES = ['All', 'General', 'Writing', 'Coding', 'Analysis', 'Creative', 'Research', 'Business', 'Education', 'Marketing', 'Other'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Forked' },
  { value: 'rating', label: 'Top Rated' },
];

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ prompt, isOpen, onClose, onImport, isImported }: { prompt: MarketplacePrompt | null; isOpen: boolean; onClose: () => void; onImport: (id: string) => void; isImported: boolean }) {
  if (!prompt) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={prompt.title}
      size="3xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
            onClick={() => {
              onImport(prompt.id);
              onClose();
            }}
            disabled={isImported}
          >
            {isImported ? 'Already Imported' : 'Import to Library'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link to={`/creators/${prompt.author_id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
              {prompt.author_name}
            </Link>
            <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}</p>
          </div>
          <div className="text-right">
            <StarRating rating={prompt.avg_rating} count={prompt.rating_count} />
          </div>
        </div>

        {/* Description */}
        {prompt.description && (
          <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
            <p className="text-xs text-blue-900">{prompt.description}</p>
          </div>
        )}

        {/* Body preview */}
        <div className="rounded-lg bg-gray-50 p-4 border" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-mono text-gray-700 whitespace-pre-wrap line-clamp-10">{prompt.body}</p>
          <p className="text-xs text-gray-500 mt-2">... (preview truncated)</p>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <p className="text-gray-500">Category</p>
            <p className="font-medium text-gray-900">{prompt.category}</p>
          </div>
          <div>
            <p className="text-gray-500">Quality Score</p>
            <p className="font-medium text-gray-900">{prompt.quality_score ?? '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Forks</p>
            <p className="font-medium text-gray-900">{prompt.fork_count}</p>
          </div>
          <div>
            <p className="text-gray-500">Uses</p>
            <p className="font-medium text-gray-900">{prompt.use_count}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t" style={{ borderColor: 'var(--color-border)' }} />

        {/* Variants/Fork Tracking */}
        <VariantsSection promptId={prompt.id} originalId={prompt.fork_of_id} />

        {/* Divider */}
        <div className="border-t" style={{ borderColor: 'var(--color-border)' }} />

        {/* Reviews */}
        <ReviewsSection promptId={prompt.id} />
      </div>
    </Modal>
  );
}

// ─── Marketplace Page ──────────────────────────────────────────────────────────

export function MarketplacePage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);
  const [previewPrompt, setPreviewPrompt] = useState<MarketplacePrompt | null>(null);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [userRatings, setUserRatings] = useState<Record<string, number | null>>({});

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const { prompts, total, isLoading, forkPrompt, ratePrompt, getMyRating, favoritePrompt, unfavoritePrompt } = useMarketplace({
    search,
    category: category === 'All' ? '' : category,
    sort,
    page,
  });

  const totalPages = Math.ceil(total / 20);

  const handleImport = useCallback(async (promptId: string) => {
    try {
      await forkPrompt(promptId);
      setImported((prev) => new Set([...prev, promptId]));
      showToast.success('Prompt imported to your library!');
    } catch {
      showToast.error('Failed to import prompt.');
    }
  }, [forkPrompt]);

  const handleRate = useCallback(async (promptId: string, score: number) => {
    try {
      await ratePrompt(promptId, score);
      setUserRatings((prev) => ({ ...prev, [promptId]: score }));
    } catch {
      showToast.error('Failed to save rating.');
    }
  }, [ratePrompt]);

  const handleFavorite = useCallback(async (promptId: string) => {
    try {
      if (favorites.has(promptId)) {
        await unfavoritePrompt(promptId);
        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(promptId);
          return next;
        });
      } else {
        await favoritePrompt(promptId);
        setFavorites((prev) => new Set([...prev, promptId]));
      }
    } catch {
      showToast.error('Failed to update favorite.');
    }
  }, [favorites, favoritePrompt, unfavoritePrompt]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-5" style={{ borderColor: 'var(--color-border)' }}>
        <h1 className="text-lg font-bold text-gray-900">Marketplace</h1>
        <p className="text-sm text-gray-500 mt-0.5">Discover & import prompts from the community</p>

        {/* Search */}
        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search prompts..."
              className="block w-full rounded-lg border bg-white pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none transition-colors"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--color-bg)' }}>
        {/* Filters */}
        <div className="mb-6 space-y-3">
          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat);
                  setPage(1);
                }}
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  category === cat
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border text-gray-600 hover:border-brand-300 hover:text-brand-600',
                )}
                style={category !== cat ? { borderColor: 'var(--color-border)' } : {}}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort & Advanced Filters */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 w-fit rounded-lg border bg-white p-1" style={{ borderColor: 'var(--color-border)' }}>
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => {
                    setSort(o.value);
                    setPage(1);
                  }}
                  className={clsx(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    sort === o.value ? 'bg-brand-600 text-white' : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<AdjustmentsHorizontalIcon className="h-4 w-4" />}
              onClick={() => setShowAdvancedFilters(true)}
            >
              Advanced
            </Button>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : prompts.length === 0 ? (
          <EmptyState
            icon={<GlobeAltIcon className="h-12 w-12" />}
            title="No prompts found"
            description="Try adjusting your search or filters"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
              {prompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  isImported={imported.has(prompt.id)}
                  isFavorited={favorites.has(prompt.id)}
                  onImport={handleImport}
                  onPreview={setPreviewPrompt}
                  onRate={handleRate}
                  onFavorite={handleFavorite}
                  userRating={userRatings[prompt.id]}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      <PreviewModal
        prompt={previewPrompt}
        isOpen={Boolean(previewPrompt)}
        onClose={() => setPreviewPrompt(null)}
        onImport={handleImport}
        isImported={previewPrompt ? imported.has(previewPrompt.id) : false}
      />

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <AdvancedFilters
          onApply={(filters) => {
            console.log('Applied filters:', filters);
            setShowAdvancedFilters(false);
            // Filter state can be added to useMarketplace if needed
          }}
          onClose={() => setShowAdvancedFilters(false)}
        />
      )}
    </div>
  );
}
