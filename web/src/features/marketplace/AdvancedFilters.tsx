import { useState } from 'react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { clsx } from 'clsx';

interface AdvancedFiltersProps {
  onApply: (filters: AdvancedFilterState) => void;
  onClose: () => void;
}

export interface AdvancedFilterState {
  qualityMin: number;
  qualityMax: number;
  ratingMin: number;
  ratingMax: number;
  minUseCount: number;
  maxUseCount: number;
  selectedTags: string[];
  isFavoritesOnly: boolean;
}

const COMMON_TAGS = ['code-review', 'marketing', 'sales', 'seo', 'writing', 'python', 'api', 'design', 'startup', 'data'];

export function AdvancedFilters({ onApply, onClose }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<AdvancedFilterState>({
    qualityMin: 0,
    qualityMax: 100,
    ratingMin: 0,
    ratingMax: 5,
    minUseCount: 0,
    maxUseCount: 10000,
    selectedTags: [],
    isFavoritesOnly: false,
  });

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Advanced Filters</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Quality Score */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Quality Score: {filters.qualityMin} - {filters.qualityMax}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={filters.qualityMin}
                onChange={(e) =>
                  setFilters(prev => ({ ...prev, qualityMin: Number(e.target.value) }))
                }
                className="w-full"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={filters.qualityMax}
                onChange={(e) =>
                  setFilters(prev => ({ ...prev, qualityMax: Number(e.target.value) }))
                }
                className="w-full"
              />
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Average Rating: {filters.ratingMin.toFixed(1)} - {filters.ratingMax.toFixed(1)}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={filters.ratingMin}
                onChange={(e) =>
                  setFilters(prev => ({ ...prev, ratingMin: Number(e.target.value) }))
                }
                className="w-full"
              />
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={filters.ratingMax}
                onChange={(e) =>
                  setFilters(prev => ({ ...prev, ratingMax: Number(e.target.value) }))
                }
                className="w-full"
              />
            </div>
          </div>

          {/* Use Count */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Minimum Uses: {filters.minUseCount}
            </label>
            <input
              type="range"
              min="0"
              max="10000"
              step="10"
              value={filters.minUseCount}
              onChange={(e) =>
                setFilters(prev => ({ ...prev, minUseCount: Number(e.target.value) }))
              }
              className="w-full"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() =>
                    setFilters(prev => ({
                      ...prev,
                      selectedTags: prev.selectedTags.includes(tag)
                        ? prev.selectedTags.filter(t => t !== tag)
                        : [...prev.selectedTags, tag],
                    }))
                  }
                  className={clsx(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    filters.selectedTags.includes(tag)
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Favorites only */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="favorites-only"
              checked={filters.isFavoritesOnly}
              onChange={(e) =>
                setFilters(prev => ({ ...prev, isFavoritesOnly: e.target.checked }))
              }
              className="rounded border-gray-300"
            />
            <label htmlFor="favorites-only" className="text-sm text-gray-900 cursor-pointer">
              Show only favorites
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-white px-6 py-4 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
