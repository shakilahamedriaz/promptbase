import { useState } from 'react';
import { useReviews } from '@/hooks/useReviews';
import { useAuthStore } from '@/store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { StarIcon, HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid, HandThumbUpIcon as HandThumbUpSolid, HandThumbDownIcon as HandThumbDownSolid } from '@heroicons/react/24/solid';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { clsx } from 'clsx';

interface ReviewsSectionProps {
  promptId: string;
}

export function ReviewsSection({ promptId }: ReviewsSectionProps) {
  const { user } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', rating: 5 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { reviews, total, isLoading, createReview, voteHelpful } = useReviews(promptId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    setIsSubmitting(true);
    try {
      await createReview(formData.title, formData.content, formData.rating);
      setFormData({ title: '', content: '', rating: 5 });
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Reviews ({total})
        </h3>

        {user && !showForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            className="mb-4"
          >
            Write a Review
          </Button>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg border bg-gray-50">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                    className="transition-colors"
                  >
                    {star <= formData.rating ? (
                      <StarSolid className="h-6 w-6 text-yellow-400" />
                    ) : (
                      <StarIcon className="h-6 w-6 text-gray-300" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Review title"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
              />
            </div>

            <div className="mb-4">
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Share your thoughts... (minimum 10 characters)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !formData.title.trim() || formData.content.length < 10}
              >
                {isSubmitting ? 'Posting...' : 'Post Review'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ title: '', content: '', rating: 5 });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={<StarIcon className="h-12 w-12" />}
          title="No reviews yet"
          description="Be the first to review this prompt"
          actions={
            user
              ? [{ label: 'Write Review', onClick: () => setShowForm(true), variant: 'primary' }]
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-lg border bg-white p-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarSolid
                          key={star}
                          className={clsx(
                            'h-3.5 w-3.5',
                            star <= review.rating ? 'text-yellow-400' : 'text-gray-200'
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{review.title}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {review.author_name} • {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Content */}
              <p className="text-sm text-gray-700 mb-3">{review.content}</p>

              {/* Helpful votes */}
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => voteHelpful(review.id, true)}
                  className={clsx(
                    'flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors',
                    review.user_voted_helpful === true
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <HandThumbUpIcon className="h-3.5 w-3.5" />
                  {review.helpful_count}
                </button>
                <button
                  onClick={() => voteHelpful(review.id, false)}
                  className={clsx(
                    'flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors',
                    review.user_voted_helpful === false
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <HandThumbDownIcon className="h-3.5 w-3.5" />
                  {review.unhelpful_count}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
