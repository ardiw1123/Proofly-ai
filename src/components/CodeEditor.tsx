'use client';

import { useMemo, useRef } from 'react';

interface CodeEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}

/**
 * Monospace editor with a synced line-number gutter.
 * Intentionally a textarea: no heavyweight editor dependency for the MVP.
 */
export function CodeEditor({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  rows = 9,
}: CodeEditorProps) {
  const gutterRef = useRef<HTMLDivElement>(null);

  const lineCount = useMemo(
    () => Math.max(rows, value.split('\n').length),
    [rows, value],
  );

  return (
    <div className="flex overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 transition-colors focus-within:border-blue-500/60">
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="select-none overflow-hidden border-r border-zinc-800 bg-zinc-900/60 px-3 py-4 text-right font-mono text-xs leading-6 text-zinc-600"
      >
        {Array.from({ length: lineCount }, (_, index) => (
          <div key={index}>{index + 1}</div>
        ))}
      </div>

      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => {
          if (gutterRef.current) {
            gutterRef.current.scrollTop = event.currentTarget.scrollTop;
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        rows={rows}
        className="w-full resize-y bg-transparent px-4 py-4 font-mono text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 disabled:opacity-60"
      />
    </div>
  );
}
