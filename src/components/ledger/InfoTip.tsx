import { Info } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useRef, useState, type ReactNode } from 'react'

/** A small info icon whose explanation opens on hover, focus or tap, so the page itself stays quiet. */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const hovering = useRef(false)
  return (
    // While a mouse rests on the icon, a click must not close the tip the hover just opened.
    <Popover.Root open={open} onOpenChange={(next) => (next || !hovering.current) && setOpen(next)}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`${label}的说明`}
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
          className="glass z-50 max-w-[16rem] rounded-xl bg-(--glass-strong) px-3 py-2 text-[13px] leading-relaxed font-normal text-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
