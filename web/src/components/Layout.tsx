import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  BookOpenIcon,
  SparklesIcon,
  ClockIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { to: '/library', label: 'Library', icon: BookOpenIcon },
  { to: '/refiner', label: 'AI Refiner', icon: SparklesIcon },
  { to: '/marketplace', label: 'Explore', icon: GlobeAltIcon },
  { to: '/history', label: 'History', icon: ClockIcon },
  { to: '/analytics', label: 'Analytics', icon: ChartBarIcon },
  { to: '/settings', label: 'Settings', icon: Cog6ToothIcon },
];

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.display_name
    ? user.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className="flex w-[220px] shrink-0 flex-col border-r"
        style={{
          background: 'var(--color-sidebar)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 py-[18px] border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-brand-600 shadow-sm">
            <SparklesIcon className="h-[15px] w-[15px] text-white" />
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-tight text-gray-900 leading-none">PromptVault</p>
            <p className="text-[10px] font-semibold text-brand-500 mt-0.5 tracking-wide uppercase">Pro</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          <ul className="space-y-0.5">
            {navItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-gray-500 hover:bg-white/70 hover:text-gray-800',
                    )
                  }
                >
                  <Icon className="h-[16px] w-[16px] shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom */}
        <div
          className="border-t p-2.5 space-y-0.5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {user && (
            <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5">
              <div className="h-7 w-7 shrink-0 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden ring-1 ring-brand-200">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.display_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-brand-600">{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-gray-800 leading-none">{user.display_name}</p>
                <p className="truncate text-[11px] text-gray-400 mt-0.5">{user.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-[16px] w-[16px]" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--color-bg)' }}>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
