import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartBarIcon, ArrowTrendingUpIcon, CircleStackIcon, ClockIcon } from '@heroicons/react/24/outline';
import { api } from '@/api/client';
import { showToast } from '@/components/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsSummary {
  total_prompts: number;
  total_uses: number;
  total_refinements: number;
  avg_quality_score: number;
  prompts_this_week: number;
  uses_this_week: number;
}

interface TopPrompt {
  id: string;
  title: string;
  use_count: number;
  quality_score: number | null;
}

interface PlatformBreakdown {
  platform: string;
  count: number;
  percentage: number;
}

interface ActiveHour {
  hour: number;
  day: string;
  count: number;
}

// ─── Color palette ────────────────────────────────────────────────────────────

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#14b8a6'];

const PIE_COLORS: Record<string, string> = {
  chatgpt: '#22c55e',
  claude: '#f97316',
  gemini: '#3b82f6',
  perplexity: '#a855f7',
  grok: '#6b7280',
  copilot: '#0ea5e9',
  other: '#374151',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: number;
}) {
  return (
    <div className="rounded-[14px] border bg-white p-5 shadow-card" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 border border-brand-100">
          <Icon className="h-5 w-5 text-brand-600" />
        </div>
        {trend !== undefined && (
          <span
            className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}
          >
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-[22px] font-bold tracking-tight text-gray-900">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-[13px] font-medium text-gray-500">{label}</p>
      {sub && <p className="mt-1 text-[12px] text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg">
      {label && <p className="mb-1 text-xs text-gray-400">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ─── Heatmap Cell ─────────────────────────────────────────────────────────────

function HeatmapCell({ count, max }: { count: number; max: number }) {
  const intensity = max === 0 ? 0 : count / max;
  const alpha = Math.round(intensity * 255)
    .toString(16)
    .padStart(2, '0');
  const bg = count === 0 ? '#f3f4f6' : `#6366f1${alpha}`;

  return (
    <div
      className="h-6 w-6 rounded-sm border border-gray-100 transition-colors"
      style={{ backgroundColor: bg }}
      title={`${count} uses`}
    />
  );
}

// ─── Analytics Page ───────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topPrompts, setTopPrompts] = useState<TopPrompt[]>([]);
  const [platforms, setPlatforms] = useState<PlatformBreakdown[]>([]);
  const [activeHours, setActiveHours] = useState<ActiveHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      try {
        const [summaryData, topPromptsData, platformsData, activeHoursData] = await Promise.all([
          api.get<AnalyticsSummary>('/analytics/summary'),
          api.get<TopPrompt[]>('/analytics/top-prompts'),
          api.get<PlatformBreakdown[]>('/analytics/platforms'),
          api.get<ActiveHour[]>('/analytics/active-hours'),
        ]);
        setSummary(summaryData);
        setTopPrompts(topPromptsData);
        setPlatforms(platformsData);
        setActiveHours(activeHoursData);
      } catch {
        showToast.error('Failed to load analytics data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAll();
  }, []);

  // Build heatmap matrix: hours 0-23 × days 0-6
  const heatmapMatrix = Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => {
      const entry = activeHours.find(
        (e) => e.hour === hour && e.day === DAYS[day],
      );
      return entry?.count ?? 0;
    }),
  );
  const maxHeatmap = Math.max(...heatmapMatrix.flat(), 1);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b bg-white px-6 py-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <ChartBarIcon className="h-6 w-6 text-brand-500" />
          <div>
            <h1 className="text-[17px] font-bold tracking-tight text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-400">Your prompt usage insights</p>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: 'var(--color-bg)' }}>
        {/* Stats Cards */}
        {summary && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Prompts"
              value={summary.total_prompts}
              sub={`+${summary.prompts_this_week} this week`}
              icon={CircleStackIcon}
              trend={summary.prompts_this_week > 0 ? 12 : 0}
            />
            <StatCard
              label="Total Uses"
              value={summary.total_uses}
              sub={`+${summary.uses_this_week} this week`}
              icon={ArrowTrendingUpIcon}
              trend={summary.uses_this_week > 0 ? 8 : 0}
            />
            <StatCard
              label="AI Refinements"
              value={summary.total_refinements}
              icon={ChartBarIcon}
            />
            <StatCard
              label="Avg Quality Score"
              value={summary.avg_quality_score ?? '—'}
              icon={ChartBarIcon}
            />
          </div>
        )}

        {/* Top Prompts Bar Chart */}
        <div className="rounded-[14px] border bg-white p-6 shadow-card" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="mb-4 text-[13px] font-semibold text-gray-700 flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-4 w-4 text-brand-500" />
            Top Prompts by Usage
          </h2>
          {topPrompts.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topPrompts} margin={{ top: 4, right: 4, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="title"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 20) + '…' : v}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="use_count" name="Uses" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Platform Breakdown (Pie) + Quality Trend (Line) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Platform Pie */}
          <div className="rounded-[14px] border bg-white p-6 shadow-card" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="mb-4 text-[13px] font-semibold text-gray-700">Platform Breakdown</h2>
            {platforms.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No data yet.</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie
                      data={platforms}
                      dataKey="count"
                      nameKey="platform"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {platforms.map((entry) => (
                        <Cell
                          key={entry.platform}
                          fill={PIE_COLORS[entry.platform] || CHART_COLORS[0]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as PlatformBreakdown;
                        return (
                          <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm shadow-lg">
                            <p className="font-medium capitalize text-gray-900">{d.platform}</p>
                            <p className="text-gray-500">{d.count} uses ({d.percentage.toFixed(1)}%)</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <ul className="flex-1 space-y-2">
                  {platforms.slice(0, 6).map((p) => (
                    <li key={p.platform} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: PIE_COLORS[p.platform] || CHART_COLORS[0] }}
                        />
                        <span className="capitalize text-gray-600">{p.platform}</span>
                      </span>
                      <span className="text-gray-400">{p.percentage.toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Weekly Uses Line */}
          <div className="rounded-[14px] border bg-white p-6 shadow-card" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="mb-4 text-[13px] font-semibold text-gray-700">Usage Over Time</h2>
            {topPrompts.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={topPrompts.slice(0, 10).map((p, i) => ({
                    name: `W${i + 1}`,
                    uses: p.use_count,
                    score: p.quality_score ?? 0,
                  }))}
                  margin={{ top: 4, right: 4, bottom: 4, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', color: '#6b7280' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="uses"
                    name="Uses"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Quality"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', r: 4 }}
                    strokeDasharray="4 2"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Active Hours Heatmap */}
        <div className="rounded-[14px] border bg-white p-6 shadow-card" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="mb-4 text-[13px] font-semibold text-gray-700 flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-brand-500" />
            Active Hours Heatmap
          </h2>
          <div className="overflow-x-auto">
            {/* Hour labels */}
            <div className="flex items-center gap-1 mb-1 ml-10">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="w-6 text-center text-[10px] text-gray-400">
                  {h % 6 === 0 ? `${h}h` : ''}
                </div>
              ))}
            </div>

            {/* Grid */}
            {DAYS.map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-1 mb-1">
                <span className="w-8 text-right text-[10px] text-gray-400 mr-1">{day}</span>
                {heatmapMatrix[dayIdx].map((count, hour) => (
                  <HeatmapCell key={`${day}-${hour}`} count={count} max={maxHeatmap} />
                ))}
              </div>
            ))}

            {/* Legend */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] text-gray-400">Less</span>
              {[0, 0.25, 0.5, 0.75, 1].map((v) => {
                const alpha = Math.round(v * 255).toString(16).padStart(2, '0');
                const bg = v === 0 ? '#f3f4f6' : `#6366f1${alpha}`;
                return <div key={v} className="h-4 w-4 rounded-sm" style={{ backgroundColor: bg }} />;
              })}
              <span className="text-[10px] text-gray-400">More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
