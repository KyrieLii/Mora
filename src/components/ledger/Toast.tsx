import { cn } from '@/lib/utils'
import { CircleAlert } from 'lucide-react'
import { useEffect } from 'react'

export interface ToastMessage {
  id: number
  text: string
}

/** A short-lived error notice. Place it inside a positioned container, such as a dialog's content. */
export function Toast({ toast, onDone, className }: { toast: ToastMessage | null; onDone: () => void; className?: string }) {
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(onDone, 5000)
    return () => window.clearTimeout(timer)
  }, [toast, onDone])

  return (
    <div aria-live="assertive" className={cn('pointer-events-none absolute inset-x-4 top-3 z-10 flex justify-center', className)}>
      {toast && (
        <p
          key={toast.id}
          role="alert"
          className="glass-bar flex max-w-full items-start gap-2 rounded-2xl border border-(--glass-edge) px-4 py-3 text-[14px] leading-snug font-semibold text-destructive shadow-[0_18px_40px_-18px_var(--glass-shadow)] animate-in fade-in-0 slide-in-from-top-2"
        >
          <CircleAlert className="mt-px size-4 shrink-0" />
          <span className="min-w-0">{toast.text}</span>
        </p>
      )}
    </div>
  )
}
