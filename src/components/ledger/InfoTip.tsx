import { Info } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useI18n } from '@/i18n'
import { useRef, useState, type ReactNode } from 'react'

/** A small info icon whose explanation opens on hover, focus or tap, so the page itself stays quiet. */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const hovering = useRef(false)
  return (
    // While a mouse rests on the icon, a click must not close the tip the hover just opened.
    <Popover.Root open={open} onOpenChange={(next) => (next || !hovering.current) && setOpen(next)}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={t.common.info(label)}
          className="relative inline-grid size-6 shrink-0 place-items-center rounded-full align-middle text-muted-foreground transition-colors after:absolute after:-inset-2.5 hover:bg-muted hover:text-foreground"
          onPointerEnter={(event) => {
            if (event.pointerType !== 'mouse') return
            hovering.current = true
            setOpen(true)
          }}
          onPointerLeave={(event) => {
            if (event.pointerType !== 'mouse') return
            hovering.current = false
            setOpen(false)
          }}
          // Keyboard focus opens it; a tap's focus is left to the click so the tip doesn't open and shut at once.
          onFocus={(event) => event.currentTarget.matches(':focus-visible') && setOpen(true)}
          onBlur={() => !hovering.current && setOpen(false)}
        >
          <Info className="size-4" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="z-50 max-w-[16rem] rounded-xl border border-border bg-popover px-3 py-2 text-[13px] leading-relaxed font-normal text-popover-foreground shadow-[0_12px_30px_-12px_var(--glass-shadow)]"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
