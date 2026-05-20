import { useState } from 'react'
import MacroCard from '@/components/MacroCard'
import type { OcrTotals } from '@/lib/gemini'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContextLabel {
  /** Stable key — 'ocr-<n>' for unscanned items, DB id once saved to library. */
  key: string
  /** Actual DB id — undefined until the label is saved to the library. */
  id?: string
  name: string
  macros: OcrTotals
  origin: 'scanned' | 'library' | 'batch'
}

interface Props {
  labels: ContextLabel[]
  onRemove: (key: string) => void
  onOpenLibrary: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ORIGIN_ICON: Record<ContextLabel['origin'], string> = {
  scanned: '📷',
  library: '📚',
  batch:   '🍲',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContextTray({ labels, onRemove, onOpenLibrary }: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const activeLabel = labels.find((l) => l.key === activeKey) ?? null

  return (
    <>
      {/* Tray bar — always shown so "+ Add" is reachable */}
      <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 overflow-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <span className="text-[11px] font-medium text-gray-400 shrink-0 uppercase tracking-wide">
            Context
          </span>

          {labels.map((label) => (
            <div
              key={label.key}
              className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2 py-0.5 shrink-0 shadow-sm"
            >
              <span className="text-[11px]">{ORIGIN_ICON[label.origin]}</span>
              <button
                type="button"
                onClick={() => setActiveKey(label.key)}
                className="text-xs font-medium text-gray-800 hover:text-blue-600 transition-colors max-w-[110px] truncate"
              >
                {label.name}
              </button>
              <button
                type="button"
                onClick={() => onRemove(label.key)}
                aria-label={`Remove ${label.name} from context`}
                className="text-gray-300 hover:text-gray-500 transition-colors ml-0.5 leading-none"
              >
                <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-2.5 h-2.5">
                  <path d="M8 2L2 8M2 2L8 8" />
                </svg>
              </button>
            </div>
          ))}

          {/* Add from library */}
          <button
            type="button"
            onClick={onOpenLibrary}
            aria-label="Add label from library"
            className="flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700 border border-blue-200 hover:border-blue-400 bg-white rounded-full px-2 py-0.5 shrink-0 transition-colors shadow-sm"
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3 h-3">
              <path d="M6 2v8M2 6h8" />
            </svg>
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Label detail bottom sheet */}
      {activeLabel && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setActiveKey(null)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-lg p-4 pb-safe space-y-3 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{ORIGIN_ICON[activeLabel.origin]}</span>
                <h3 className="font-semibold text-gray-900 text-base">{activeLabel.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveKey(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Macro card — read-only, no save/log actions */}
            <MacroCard totals={activeLabel.macros} />
          </div>
        </div>
      )}
    </>
  )
}
