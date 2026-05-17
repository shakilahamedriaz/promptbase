import { useEarnings } from '@/hooks/useEarnings';
import { formatDistanceToNow } from 'date-fns';
import { CurrencyDollarIcon, ArrowTrendingUpIcon, ShoppingCartIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { EmptyState } from '@/components/EmptyState';

export function EarningsDashboard() {
  const { summary, topPrompts, payouts, isLoading, error } = useEarnings();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <EmptyState
        icon={<CurrencyDollarIcon className="h-12 w-12" />}
        title="Unable to load earnings"
        description={error || 'Something went wrong'}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-5">
        <h1 className="text-lg font-bold text-gray-900">Creator Earnings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track your revenue and payouts</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-white">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Revenue */}
          <div className="bg-white rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <div className="p-2 rounded-lg bg-blue-100">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.total_revenue}</p>
            <p className="text-xs text-gray-500 mt-1">Credits earned</p>
          </div>

          {/* This Month */}
          <div className="bg-white rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <div className="p-2 rounded-lg bg-green-100">
                <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.this_month}</p>
            <p className="text-xs text-gray-500 mt-1">Monthly earnings</p>
          </div>

          {/* This Week */}
          <div className="bg-white rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <div className="p-2 rounded-lg bg-purple-100">
                <CalendarIcon className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.this_week}</p>
            <p className="text-xs text-gray-500 mt-1">Weekly earnings</p>
          </div>

          {/* Avg Price */}
          <div className="bg-white rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Avg Price</p>
              <div className="p-2 rounded-lg bg-orange-100">
                <ShoppingCartIcon className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.avg_price.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">Credits per sale</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="bg-white rounded-lg border p-4 mb-8">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{summary.total_sales_count}</span> total sales across all prompts
          </p>
        </div>

        {/* Top Prompts */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Top Earning Prompts</h2>
          </div>
          {topPrompts.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<ArrowTrendingUpIcon className="h-8 w-8" />}
                title="No sales yet"
                description="Your top prompts will appear here once they're purchased"
              />
            </div>
          ) : (
            <div className="divide-y">
              {topPrompts.map((prompt) => (
                <div key={prompt.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{prompt.title}</p>
                      <p className="text-sm text-gray-600">
                        {prompt.sales} sales • ⭐ {prompt.avg_rating.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{prompt.revenue} credits</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payouts */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden mt-8">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Payout History</h2>
          </div>
          {payouts.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<CurrencyDollarIcon className="h-8 w-8" />}
                title="No payouts yet"
                description="Your payout history will appear here"
              />
            </div>
          ) : (
            <div className="divide-y">
              {payouts.map((payout) => (
                <div key={payout.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{payout.total_amount} credits</p>
                      <p className="text-sm text-gray-600">
                        {formatDistanceToNow(new Date(payout.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          payout.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : payout.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
