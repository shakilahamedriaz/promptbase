import { useState, useEffect, KeyboardEvent } from 'react';
import { XMarkIcon, ClockIcon, TagIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { type Prompt, type PromptVersion, type CreatePromptPayload } from '@/hooks/usePrompts';
import { formatDistanceToNow } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromptEditorProps {
  isOpen: boolean;
  onClose: () => void;
  prompt?: Prompt | null;
  onSave: (payload: CreatePromptPayload) => Promise<void>;
  getVersions?: (id: string) => Promise<PromptVersion[]>;
  isSaving: boolean;
}

const CATEGORIES = [
  'General',
  'Writing',
  'Coding',
  'Analysis',
  'Creative',
  'Research',
  'Business',
  'Education',
  'Marketing',
  'Other',
];

const SUGGESTED_TAGS = [
  'gpt', 'claude', 'gemini', 'productivity', 'template', 'reusable',
  'detailed', 'concise', 'technical', 'beginner', 'expert', 'draft',
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PromptEditor({
  isOpen,
  onClose,
  prompt,
  onSave,
  getVersions,
  isSaving,
}: PromptEditorProps) {
  const isEditing = Boolean(prompt);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('General');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setBody(prompt.body);
      setCategory(prompt.category || 'General');
      setTags(prompt.tags || []);
    } else {
      setTitle('');
      setBody('');
      setCategory('General');
      setTags([]);
    }
    setErrors({});
    setShowVersions(false);
    setVersions([]);
    setTagInput('');
  }, [prompt, isOpen]);

  // Tag typeahead
  useEffect(() => {
    if (tagInput.trim().length > 0) {
      const lower = tagInput.toLowerCase();
      setTagSuggestions(
        SUGGESTED_TAGS.filter(
          (t) => t.includes(lower) && !tags.includes(t),
        ).slice(0, 5),
      );
    } else {
      setTagSuggestions([]);
    }
  }, [tagInput, tags]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required.';
    if (!body.trim()) newErrors.body = 'Prompt body is required.';
    if (body.length > 10000) newErrors.body = 'Prompt body must be under 10,000 characters.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    await onSave({ title: title.trim(), body: body.trim(), category, tags });
    onClose();
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
    setTagSuggestions([]);
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const handleLoadVersions = async () => {
    if (!prompt || !getVersions) return;
    setLoadingVersions(true);
    try {
      const v = await getVersions(prompt.id);
      setVersions(v);
      setShowVersions(true);
    } finally {
      setLoadingVersions(false);
    }
  };

  const restoreVersion = (v: PromptVersion) => {
    setBody(v.body);
    setShowVersions(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Prompt' : 'New Prompt'}
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            {isEditing ? 'Save Changes' : 'Create Prompt'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your prompt a descriptive title"
            maxLength={200}
            className="block w-full rounded-xl border bg-white px-3 py-2.5 text-[13px] text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none transition-colors" style={{ borderColor: 'var(--color-border)' }}
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Body */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Prompt Body <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${body.length > 9000 ? 'text-yellow-600' : 'text-gray-400'}`}>
                {body.length.toLocaleString()} / 10,000
              </span>
              {isEditing && getVersions && (
                <button
                  type="button"
                  onClick={handleLoadVersions}
                  className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700"
                >
                  <ClockIcon className="h-3.5 w-3.5" />
                  {loadingVersions ? 'Loading…' : 'Version history'}
                </button>
              )}
            </div>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your prompt here. Use {{variable}} syntax for dynamic placeholders."
            rows={8}
            maxLength={10000}
            className="block w-full rounded-xl border bg-white px-3 py-2.5 text-[13px] text-gray-800 placeholder-gray-400 font-mono focus:border-brand-400 focus:outline-none resize-y transition-colors" style={{ borderColor: 'var(--color-border)' }}
          />
          {errors.body && <p className="mt-1 text-xs text-red-500">{errors.body}</p>}
        </div>

        {/* Version History Panel */}
        {showVersions && versions.length > 0 && (
          <div className="rounded-xl border bg-white" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <ClockIcon className="h-3.5 w-3.5" />
                Version History
              </span>
              <button
                onClick={() => setShowVersions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <ul className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between px-4 py-2 text-xs">
                  <div>
                    <span className="font-medium text-gray-800">v{v.version_number}</span>
                    <span className="ml-2 text-gray-400">
                      {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                    </span>
                    <span className="ml-2 text-gray-500 font-mono">
                      {v.body.slice(0, 60)}…
                    </span>
                  </div>
                  <button
                    onClick={() => restoreVersion(v)}
                    className="ml-3 text-brand-500 hover:text-brand-700 shrink-0"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <TagIcon className="h-4 w-4" />
            Tags
          </label>
          <div className="relative">
            <div className="flex flex-wrap gap-1.5 rounded-xl border bg-white px-3 py-2.5 min-h-[42px] focus-within:border-brand-400 transition-colors" style={{ borderColor: 'var(--color-border)' }}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs text-brand-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-brand-500 hover:text-brand-800"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? 'Add tags (press Enter or comma)' : ''}
                className="flex-1 min-w-[120px] bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
            </div>

            {/* Suggestions dropdown */}
            {tagSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-xl border bg-white shadow-panel" style={{ borderColor: 'var(--color-border)' }}>
                {tagSuggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onClick={() => addTag(suggestion)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
                    >
                      #{suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">Up to 10 tags. Type and press Enter or comma.</p>
        </div>
      </div>
    </Modal>
  );
}
