import { useEffect, useRef, useState } from 'react'

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Eases a number toward its new value so an edit visibly moves the verdict. */
export function useTween(value: number, duration = 360) {
  const [shown, setShown] = useState(value)
  const current = useRef(value)

  useEffect(() => {
    if (prefersReducedMotion()) {
      current.current = value
      setShown(value)
      return
    }
    const from = current.current
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress)
      current.current = from + (value - from) * eased
      setShown(current.current)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return shown
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}
