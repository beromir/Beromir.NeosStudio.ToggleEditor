import { useEffect, useState } from 'react'

/**
 * Colors are often project design tokens (`color: "var(--x)"`). The site's
 * CSS defining that custom property loads only in the preview iframe, never
 * in the Studio shell's own document, so a plain `var(...)` here resolves to
 * nothing - read the live value from the iframe's :root instead.
 */
export function resolveColor(value: string): string {
  const match = value.match(/^var\((--[\w-]+)\)$/)
  if (!match) return value
  for (const frame of document.querySelectorAll('iframe')) {
    try {
      const root = (frame as HTMLIFrameElement).contentDocument?.documentElement
      if (!root) continue
      const resolved = getComputedStyle(root).getPropertyValue(match[1]).trim()
      if (resolved) return resolved
    } catch {
      // Not yet loaded - try the next frame / a later retry.
    }
  }
  return value
}

/** A few re-renders after mount, so {@link resolveColor} catches up once the preview iframe finishes loading. */
export function useCssVarsReady(): void {
  const [, forceRender] = useState(0)
  useEffect(() => {
    let attempts = 0
    const id = window.setInterval(() => {
      attempts += 1
      forceRender((n) => n + 1)
      if (attempts >= 10) window.clearInterval(id)
    }, 200)
    return () => window.clearInterval(id)
  }, [])
}
