'use client'

import type { ParentAnswer } from '@/lib/types'

interface SingleChoiceProps {
  choices: ParentAnswer[]
  onSelect: (choice: ParentAnswer) => void
}

export function SingleChoiceButtons({ choices, onSelect }: SingleChoiceProps) {
  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      {choices.map((choice) => (
        <button
          key={choice}
          onClick={() => onSelect(choice)}
          className="w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-all active:scale-95"
          style={{
            background: '#FFFFFF',
            color: 'var(--ecamo-text)',
            border: '2px solid var(--ecamo-primary-light)',
          }}
        >
          {choice}
        </button>
      ))}
    </div>
  )
}

interface MultiChoiceProps {
  choices: { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string) => void
  onConfirm: () => void
}

export function MultiChoiceButtons({ choices, selected, onToggle, onConfirm }: MultiChoiceProps) {
  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      {choices.map((choice) => {
        const isSelected = selected.includes(choice.id)
        return (
          <button
            key={choice.id}
            onClick={() => onToggle(choice.id)}
            className="w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-all active:scale-95 flex items-center gap-3"
            style={{
              background: isSelected ? 'var(--ecamo-primary)' : '#FFFFFF',
              color: isSelected ? '#FFFFFF' : 'var(--ecamo-text)',
              border: `2px solid ${isSelected ? 'var(--ecamo-primary)' : 'var(--ecamo-primary-light)'}`,
            }}
          >
            <span
              className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-xs border-2"
              style={{
                background: isSelected ? '#FFFFFF' : 'transparent',
                borderColor: isSelected ? 'var(--ecamo-primary)' : 'var(--ecamo-primary-light)',
                color: 'var(--ecamo-primary)',
              }}
            >
              {isSelected ? '✓' : ''}
            </span>
            {choice.label}
          </button>
        )
      })}
      <button
        onClick={onConfirm}
        className="mt-2 w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-95"
        style={{ background: 'var(--ecamo-primary)', color: '#FFFFFF' }}
      >
        これを選んだよ！
      </button>
    </div>
  )
}
