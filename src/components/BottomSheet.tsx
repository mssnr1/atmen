import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CloseIcon } from './icons'
import { IconButton } from './Button'

interface Props {
  open: boolean
  title: string
  closeLabel: string
  onClose: () => void
  children: ReactNode
}

/**
 * An iOS-style sheet rising from the bottom edge. It only overlays what is
 * behind it, so a running exercise keeps going. Closes on a swipe down, a tap
 * outside, the close button or Escape.
 */
export function BottomSheet({ open, title, closeLabel, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (!open) return
    setOffset(0)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    panel.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const onPointerDown = (e: React.PointerEvent) => {
    // Only start a swipe from the top of the sheet or when its content is scrolled to the top.
    const scroller = panel.current?.querySelector('[data-sheet-scroll]')
    if (scroller && scroller.scrollTop > 0 && !(e.target as HTMLElement).closest('[data-sheet-handle]')) return
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const dy = Math.max(0, e.clientY - drag.current.y)
    drag.current.dy = dy
    if (dy > 4) (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    setOffset(dy)
  }
  const onPointerUp = () => {
    if (!drag.current) return
    const { dy, t } = drag.current
    const speed = dy / Math.max(1, performance.now() - t)
    drag.current = null
    if (dy > 110 || speed > 0.6) onClose()
    else setOffset(0)
  }

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <div
        className="absolute inset-0 animate-[fade-in_200ms_ease-out] bg-black/30"
        onClick={onClose}
        data-testid="sheet-backdrop"
        aria-hidden
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        data-testid="settings-sheet"
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] max-w-md animate-[sheet-in_320ms_cubic-bezier(0.2,0.9,0.25,1)] flex-col rounded-t-[28px] bg-card pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_-8px_40px_rgb(0_0_0/0.12)] outline-none"
        style={{ transform: offset ? `translateY(${offset}px)` : undefined, transition: drag.current ? 'none' : 'transform 220ms ease' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div data-sheet-handle className="touch-none pt-2.5 pb-1">
          <div className="mx-auto h-[5px] w-10 rounded-full bg-surface-2" />
          <div className="flex items-center justify-between px-5 pt-3">
            <h2 className="text-[1.25rem] font-medium">{title}</h2>
            <IconButton label={closeLabel} onClick={onClose} className="-mr-2">
              <CloseIcon />
            </IconButton>
          </div>
        </div>
        <div data-sheet-scroll className="no-scrollbar min-h-0 overflow-y-auto overscroll-contain px-5 pb-2">
          {children}
        </div>
      </div>
    </div>
  )
}
