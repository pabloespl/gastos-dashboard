'use client'

import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
}

interface DropdownSelectProps {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  className?: string
  renderOption?: (option: DropdownOption) => ReactNode
  renderValue?: (option: DropdownOption) => ReactNode
  sizingBuffer?: string
}

export function DropdownSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar',
  className = 'w-fit',
  renderOption,
  renderValue,
  sizingBuffer = 'pr-[36px]',
}: DropdownSelectProps) {
  const [open, setOpen]             = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const containerRef                = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false)
  }

  const handleToggle = () => {
    if (!open) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const spaceBelow          = window.innerHeight - rect.bottom
        const estimatedPanelHeight = Math.min(options.length * 40, 240)
        setOpenUpward(spaceBelow < estimatedPanelHeight)
      }
    }
    setOpen(o => !o)
  }

  const activeOption = options.find(o => o.value === value)
  const activeLabel  = activeOption?.label ?? placeholder

  const longestLabel = options.reduce(
    (a, b) => b.label.length > a.label.length ? b : a,
    { label: placeholder }
  ).label

  const borderCls = open ? 'border-primary' : 'border-border hover:border-border-strong'

  const triggerCls = [
    'flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-bg-secondary px-3 py-1.5',
    'text-sm text-text-primary transition-colors duration-150 hover:bg-bg-secondary',
    borderCls,
  ].join(' ')

  const panelPositionCls = openUpward ? 'bottom-full mb-1' : 'top-full mt-1'

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {/* Sizes the container to the longest option; collapsed vertically */}
      <span aria-hidden className={`pointer-events-none invisible block h-0 overflow-hidden whitespace-nowrap px-3 ${sizingBuffer} text-sm`}>
        {longestLabel}
      </span>
      <button type="button" onClick={handleToggle} className={triggerCls}>
        <span className="truncate">
          {activeOption && renderValue ? renderValue(activeOption) : activeLabel}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className={`absolute left-0 z-50 min-w-max max-w-xs rounded-md border border-border bg-bg-card shadow-lg ${panelPositionCls}`}>
          <ul className="max-h-60 overflow-y-auto p-1">
            {options.map(option => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-bg-hover active:bg-bg-hover-strong transition-colors ${
                    option.value === value ? 'font-medium text-text-primary' : 'text-text-primary'
                  }`}
                >
                  {renderOption ? renderOption(option) : option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
