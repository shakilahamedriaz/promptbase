import { useState, useRef, ChangeEvent } from 'react';
import {
  UserCircleIcon,
  KeyIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  SunIcon,
  MoonIcon,
  TrashIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { api } from '@/api/client';
import { showToast } from '@/components/Toast';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border bg-white p-6 shadow-card" style={{ borderColor: 'var(--color-border)' }}>
      <div className="mb-5 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── API Key Field ────────────────────────────────────────────────────────────

interface ApiKeyFieldProps {
  label: string;
  provider: string;
  currentKey: string;
  onSave: (provider: string, key: string) => Promise<void>;
  isSaving: boolean;
}

function ApiKeyField({ label, provider, currentKey, onSave, isSaving }: ApiKeyFieldProps) {
  const [value, setValue] = useState(currentKey ? '•'.repeat(20) : '');
  const [isEditing, setIsEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleEdit = () => {
    setValue('');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!value.trim()) return;
    await onSave(provider, value.trim());
    setValue('•'.repeat(20));
    setIsEditing(false);
    setShowKey(false);
  };

  const handleCancel = () => {
    setValue(currentKey ? '•'.repeat(20) : '');
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
        <div className="relative">
          <input
            type={showKey && isEditing ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            readOnly={!isEditing}
            placeholder={isEditing ? `Paste your ${label} API key` : 'Not configured'}
            className={clsx(
              'block w-full rounded-xl border px-3 py-2.5 pr-10 text-sm placeholder-gray-400 focus:outline-none focus:ring-2',
              isEditing
                ? 'border-brand-400 bg-white text-gray-900 focus:ring-brand-100'
                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-default',
            )}
          />
          {isEditing && (
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showKey ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="flex gap-2 mt-5">
          <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>Save</Button>
        </div>
      ) : (
        <div className="mt-5">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            {currentKey ? 'Update' : 'Add Key'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

interface ApiKeys {
  openrouter: string;
  groq: string;
}

export function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [apiKeys, setApiKeys] = useState<ApiKeys>({ openrouter: '', groq: '' });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const importFileRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) return;
    setIsSavingProfile(true);
    try {
      const updated = await api.put<typeof user>('/auth/me', { display_name: displayName.trim() });
      updateUser(updated as Partial<typeof user> & object);
      showToast.success('Profile updated!');
    } catch {
      showToast.error('Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveApiKey = async (provider: string, key: string) => {
    setSavingKey(provider);
    try {
      await api.put('/auth/me', { [`${provider}_api_key`]: key });
      setApiKeys((prev) => ({ ...prev, [provider]: key }));
      showToast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key saved!`);
    } catch {
      showToast.error('Failed to save API key.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const response = await api.get<Blob>(`/prompts/export?format=${format}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response as unknown as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `promptvault-export-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast.success(`Exported as ${format.toUpperCase()}!`);
    } catch {
      showToast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await api.post<{ imported: number; skipped: number }>(
        '/prompts/import',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      showToast.success(`Imported ${result.imported} prompts (${result.skipped} skipped).`);
    } catch {
      showToast.error('Import failed. Check file format.');
    } finally {
      setIsImporting(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    try {
      await api.delete('/auth/account');
      showToast.success('Account deleted. Redirecting…');
      setTimeout(() => (window.location.href = '/login'), 1500);
    } catch {
      showToast.error('Failed to delete account.');
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b bg-white px-6 py-5" style={{ borderColor: 'var(--color-border)' }}>
        <h1 className="text-[17px] font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400">Manage your account and preferences</p>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--color-bg)' }}>
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Appearance */}
          <Section title="Appearance" description="Choose your preferred color theme.">
            <div className="flex gap-3">
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={clsx(
                    'flex flex-1 items-center justify-center gap-3 rounded-xl border-2 p-4 text-sm font-medium transition-colors',
                    theme === t
                      ? 'border-brand-400 bg-brand-50 text-brand-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
                  )}
                >
                  {t === 'dark' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
                  {t.charAt(0).toUpperCase() + t.slice(1)} Mode
                  {theme === t && <CheckIcon className="h-4 w-4 text-brand-600" />}
                </button>
              ))}
            </div>
          </Section>

          {/* Account Info */}
          <Section title="Account" description="Update your display name and account information.">
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 overflow-hidden">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-brand-600">
                      {user?.display_name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.display_name}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <span className={clsx(
                    'mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    user?.plan === 'pro' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500',
                  )}>
                    {(user?.plan || 'free').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Display name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Display Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex-1 rounded-xl border bg-white px-3 py-2.5 text-[13px] text-gray-800 focus:border-brand-400 focus:outline-none transition-colors" style={{ borderColor: 'var(--color-border)' }}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveProfile}
                    isLoading={isSavingProfile}
                    disabled={displayName === user?.display_name}
                  >
                    Save
                  </Button>
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400 cursor-default"
                  />
                  <UserCircleIcon className="h-5 w-5 text-gray-300" />
                </div>
                <p className="mt-1 text-xs text-gray-400">Email cannot be changed here.</p>
              </div>
            </div>
          </Section>

          {/* API Keys */}
          <Section
            title="API Keys"
            description="Connect your AI provider keys for custom model access (Pro feature)."
          >
            <div className="space-y-5">
              <div className="flex items-start gap-2 rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
                <KeyIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                <p className="text-xs text-brand-700">
                  Keys are stored encrypted and never logged. Bring your own keys for unlimited AI refinements.
                </p>
              </div>
              <ApiKeyField
                label="OpenRouter"
                provider="openrouter"
                currentKey={apiKeys.openrouter}
                onSave={handleSaveApiKey}
                isSaving={savingKey === 'openrouter'}
              />
              <ApiKeyField
                label="Groq"
                provider="groq"
                currentKey={apiKeys.groq}
                onSave={handleSaveApiKey}
                isSaving={savingKey === 'groq'}
              />
            </div>
          </Section>

          {/* Export / Import */}
          <Section
            title="Export & Import"
            description="Back up your prompts or migrate from another tool."
          >
            <div className="space-y-4">
              {/* Export */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Export Prompts</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                    onClick={() => handleExport('json')}
                    isLoading={isExporting}
                  >
                    Export JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                    onClick={() => handleExport('csv')}
                    isLoading={isExporting}
                  >
                    Export CSV
                  </Button>
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  Download all your prompts as a JSON or CSV file.
                </p>
              </div>

              {/* Divider */}
              <div className="border-t" style={{ borderColor: 'var(--color-border)' }} />

              {/* Import */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Import Prompts</p>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json,.csv"
                  onChange={handleImport}
                  className="hidden"
                  id="import-file"
                />
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
                  isLoading={isImporting}
                  onClick={() => importFileRef.current?.click()}
                >
                  Upload JSON or CSV
                </Button>
                <p className="mt-1.5 text-xs text-gray-400">
                  Supported formats: JSON (exported from PromptVault) or CSV with title/body columns.
                  Duplicate prompts will be skipped.
                </p>
              </div>
            </div>
          </Section>

          {/* Danger Zone */}
          <Section title="Danger Zone">
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-red-700">Delete Account</p>
                  <p className="mt-0.5 text-xs text-red-500">
                    Permanently delete your account and all data. This cannot be undone.
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<TrashIcon className="h-4 w-4" />}
                  onClick={() => setDeleteAccountOpen(true)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* ── Delete Account Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={deleteAccountOpen}
        onClose={() => { setDeleteAccountOpen(false); setDeleteConfirmText(''); }}
        title="Delete Account"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setDeleteAccountOpen(false); setDeleteConfirmText(''); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE'}
            >
              Permanently Delete
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will permanently delete your account, all prompts, history, and settings.
            <span className="font-semibold text-gray-900"> There is no way to recover this data.</span>
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="block w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
