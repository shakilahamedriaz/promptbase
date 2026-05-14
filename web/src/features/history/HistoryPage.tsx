import { useState, useEffect, useCallback } from 'react';
import {
  ClockIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  BookmarkIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { api } from '@/api/client';
import { showToast } from '@/components/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: string;
  prompt_id: string | null;
  body_snapshot: string;
  platform: string;
  used_at: string;
  was_refined: boolean;
}

interface HistoryResponse {
  items: HistoryEntry[];
  total: number;
  page: number;
  per_page: number;
}

type DateRange = '7d' | '30d' | '90d' | 'custom';

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: 'bg-green-50 text-green-700',
  claude: 'bg-orange-50 text-orange-700',
  gemini: 'bg-blue-50 text-blue-700',
  perplexity: 'bg-purple-50 text-purple-700',
  grok: 'bg-gray-100 text-gray-600',
  copilot: 'bg-sky-50 text-sky-700',
  other: 'bg-gray-100 text-gray-500',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [platformFilter, setPlatformFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const perPage = 15;
  const totalPages = Math.ceil(total / perPage);

  const getDateBounds = useCallback(() => {
    const now = new Date();
    switch (dateRange) {
      case '7d': return { from: startOfDay(subDays(now, 7)).toISOString(), to: endOfDay(now).toISOString() };
      case '30d': return { from: startOfDay(subDays(now, 30)).toISOString(), to: endOfDay(now).toISOString() };
      case '90d': return { from: startOfDay(subDays(now, 90)).toISOString(), to: endOfDay(now).toISOString() };
      default: return {};
    }
  }, [dateRange]);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('per_page', String(perPage));
      if (platformFilter) params.set('platform', platformFilter);

      const bounds = getDateBounds();
      if (bounds.from) params.set('from', bounds.from);
      if (bounds.to) params.set('to', bounds.to);

      const data = await api.get<HistoryResponse>(`/history?${params}`);
      setEntries(data.items);
      setTotal(data.total);
    } catch {
      showToast.error('Failed to load history.');
    } finally {
      setIsLoading(false);
    }
  }, [page, platformFilter, getDateBounds]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/history/${id}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotal((t) => t - 1);
      showToast.success('Entry deleted.');
    } catch {
      showToast.error('Failed to delete entry.');
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete('/history');
      setEntries([]);
      setTotal(0);
      setClearConfirmOpen(false);
      showToast.success('History cleared.');
    } catch {
      showToast.error('Failed to clear history.');
    }
  };

  const handleReuse = (body: string) => {
    navigator.clipboard.writeText(body);
    showToast.success('Prompt copied — ready to paste!');
  };

  const handlePinToLibrary = async (entry: HistoryEntry) => {
    setIsSaving(entry.id);
    try {
      await api.post('/prompts', {
        title: `From history: ${entry.body_snapshot.slice(0, 60)}…`,
        body: entry.body_snapshot,
        category: 'General',
        tags: [entry.platform, 'from-history'].filter(Boolean),
      });
      showToast.success('Saved to Library!');
    } catch {
      showToast.error('Failed to save to Library.');
    } finally {
      setIsSaving(null);
    }
  };

  const platforms = ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok', 'copilot', 'other'];

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b bg-white px-6 py-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-6 w-6 text-brand-500" />
            <div>
              <h1 className="text-[17px] font-bold tracking-tight text-gray-900">Usage History</h1>
              <p className="text-sm text-gray-400">{total.toLocaleString()} entries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={clsx(
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
                showFilters
                  ? 'border-brand-300 bg-brand-50 text-brand-600'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700',
              )}
            >
              <FunnelIcon className="h-4 w-4" />
              Filters
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearConfirmOpen(true)}
              disabled={total === 0}
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 animate-slide-in">
            {/* Date range */}
            <div>
              <label className="mr-2 text-xs text-gray-500">Period:</label>
              {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => { setDateRange(r); setPage(1); }}
                  className={clsx(
                    'mr-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    dateRange === r
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700',
                  )}
                >
                  {r === '7d' ? 'Last 7 days' : r === '30d' ? 'Last 30 days' : 'Last 90 days'}
                </button>
              ))}
            </div>

            {/* Platform filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Platform:</label>
              <select
                value={platformFilter}
                onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
                className="rounded-xl border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-brand-400 focus:outline-none"
              >
                <option value="">All platforms</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--color-bg)' }}>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ClockIcon className="mb-4 h-16 w-16 text-gray-200" />
            <p className="text-lg font-medium text-gray-700">No history yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Start using prompts from your library to see history here.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-[14px] border shadow-card" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ background: 'var(--color-sidebar)', borderColor: 'var(--color-border)' }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Prompt Snippet</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Platform</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Refined?</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="bg-white hover:bg-brand-50/30 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">
                        {format(new Date(entry.used_at), 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-sm truncate text-sm text-gray-700">
                          {entry.body_snapshot}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                            PLATFORM_COLORS[entry.platform] || PLATFORM_COLORS.other,
                          )}
                        >
                          {entry.platform || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {entry.was_refined ? (
                          <span className="inline-flex items-center gap-1 text-xs text-brand-600">
                            <SparklesIcon className="h-3.5 w-3.5" /> Yes
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleReuse(entry.body_snapshot)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                            title="Copy & re-use"
                          >
                            <ArrowUturnLeftIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePinToLibrary(entry)}
                            disabled={isSaving === entry.id}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
                            title="Save to Library"
                          >
                            <BookmarkIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Delete entry"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-500">
                    {page} / {totalPages}
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
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Clear Confirm Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        title="Clear All History"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setClearConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleClearAll}>Clear All</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          This will permanently delete all{' '}
          <span className="font-semibold text-gray-900">{total.toLocaleString()} history entries</span>.
          This action cannot be undone.
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-yellow-50 border border-yellow-100 px-3 py-2">
          <XMarkIcon className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
          <p className="text-xs text-yellow-700">
            This does not delete prompts in your Library — only usage history.
          </p>
        </div>
      </Modal>
    </div>
  );
}
