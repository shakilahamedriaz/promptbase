import { useVariants } from '@/hooks/useVariants';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';

interface VariantsSectionProps {
  promptId: string;
  originalId?: string | null;
}

export function VariantsSection({ promptId, originalId }: VariantsSectionProps) {
  const { variants, isLoading } = useVariants(promptId);

  if (isLoading) {
    return <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />;
  }

  if (!variants) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Original prompt link */}
      {originalId && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-900">
            This is a fork of{' '}
            <Link
              to={`/marketplace?id=${originalId}`}
              className="font-medium text-blue-700 hover:text-blue-800 underline"
            >
              another prompt
            </Link>
          </p>
        </div>
      )}

      {/* Variants list */}
      {variants.forks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Variants ({variants.forks.length})
          </h4>
          <div className="space-y-2">
            {variants.forks.map((variant) => (
              <Link
                key={variant.id}
                to={`/marketplace?id=${variant.id}`}
                className="block p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-brand-600 hover:text-brand-700">
                      {variant.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {variant.author_name} • {formatDistanceToNow(new Date(variant.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">
                      {variant.use_count} uses
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
