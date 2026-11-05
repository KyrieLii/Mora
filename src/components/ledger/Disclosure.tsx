import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

export function Disclosure({ title, children, defaultOpen }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl text-[17px] font-bold hover:text-primary focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4.5 shrink-0 text-muted-foreground group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  )
}
