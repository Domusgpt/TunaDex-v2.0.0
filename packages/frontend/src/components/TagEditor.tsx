import { useState, type FC, type KeyboardEvent } from 'react';
import type { ProjectTags } from '../lib/api';
import { useUpdateTagsMutation } from '../hooks/useProjects';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  'geometric', 'vib34d', 'flutter', 'agent',
  'creative', 'research', 'business', 'infra',
] as const;

const STATUSES = [
  'active', 'beta', 'prototype', 'research', 'delivered', 'archived',
] as const;

const PRIORITIES = ['high', 'medium', 'low'] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}

const SelectField: FC<SelectFieldProps> = ({ label, value, options, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] font-mono text-text-dim uppercase tracking-wider">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 bg-deep border border-text-dim/30 rounded-lg text-sm text-text-primary
                 font-body focus:outline-none focus:border-accent-cyan/60 focus:ring-1
                 focus:ring-accent-cyan/30 transition-colors appearance-none cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233A6480' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.5rem center',
        backgroundSize: '1.25rem',
      }}
    >
      <option value="">None</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

// ---------------------------------------------------------------------------
// TagEditor
// ---------------------------------------------------------------------------

interface TagEditorProps {
  projectId: string;
  currentTags: ProjectTags;
}

export const TagEditor: FC<TagEditorProps> = ({ projectId, currentTags }) => {
  const [category, setCategory] = useState(currentTags.category ?? '');
  const [status, setStatus] = useState(currentTags.status ?? '');
  const [priority, setPriority] = useState(currentTags.priority ?? '');
  const [group, setGroup] = useState(currentTags.group ?? '');
  const [custom, setCustom] = useState<string[]>(currentTags.custom ?? []);
  const [customInput, setCustomInput] = useState('');

  const mutation = useUpdateTagsMutation();

  const handleSave = () => {
    const tags: ProjectTags = {};
    if (category) tags.category = category;
    if (status) tags.status = status;
    if (priority) tags.priority = priority;
    if (group) tags.group = group;
    if (custom.length > 0) tags.custom = custom;
    mutation.mutate({ id: projectId, tags });
  };

  const addCustomTag = () => {
    const tag = customInput.trim().toLowerCase();
    if (tag && !custom.includes(tag)) {
      setCustom([...custom, tag]);
    }
    setCustomInput('');
  };

  const removeCustomTag = (tag: string) => {
    setCustom(custom.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTag();
    }
  };

  const isDirty =
    category !== (currentTags.category ?? '') ||
    status !== (currentTags.status ?? '') ||
    priority !== (currentTags.priority ?? '') ||
    group !== (currentTags.group ?? '') ||
    JSON.stringify(custom) !== JSON.stringify(currentTags.custom ?? []);

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-mono text-text-dim uppercase tracking-wider flex items-center gap-2">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
        Tags
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Category" value={category} options={CATEGORIES} onChange={setCategory} />
        <SelectField label="Status" value={status} options={STATUSES} onChange={setStatus} />
        <SelectField label="Priority" value={priority} options={PRIORITIES} onChange={setPriority} />
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-mono text-text-dim uppercase tracking-wider">Group</label>
          <input
            type="text"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="e.g. web-apps"
            className="px-3 py-2 bg-deep border border-text-dim/30 rounded-lg text-sm text-text-primary
                       font-body placeholder:text-text-dim/60 focus:outline-none focus:border-accent-cyan/60
                       focus:ring-1 focus:ring-accent-cyan/30 transition-colors"
          />
        </div>
      </div>

      {/* Custom tags */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-mono text-text-dim uppercase tracking-wider">Custom Tags</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {custom.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-violet/15 border border-accent-violet/30
                         rounded-full text-xs font-mono text-accent-violet"
            >
              {tag}
              <button
                onClick={() => removeCustomTag(tag)}
                className="hover:text-text-primary transition-colors"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type tag + Enter"
          className="px-3 py-2 bg-deep border border-text-dim/30 rounded-lg text-sm text-text-primary
                     font-body placeholder:text-text-dim/60 focus:outline-none focus:border-accent-cyan/60
                     focus:ring-1 focus:ring-accent-cyan/30 transition-colors"
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!isDirty || mutation.isPending}
        className="w-full py-2 px-4 bg-accent-cyan/15 border border-accent-cyan/30 rounded-lg
                   text-sm font-mono text-accent-cyan hover:bg-accent-cyan/25 disabled:opacity-40
                   disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending ? 'Saving...' : mutation.isSuccess ? 'Saved!' : 'Save Tags'}
      </button>

      {mutation.isError && (
        <p className="text-xs font-mono text-accent-rose">
          Error: {(mutation.error as Error).message}
        </p>
      )}
    </div>
  );
};
