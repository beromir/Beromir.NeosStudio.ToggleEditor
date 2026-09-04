import { useEffect, useState } from 'react'

/**
 * Resolves the "Package:Source:id" translation ids the classic UI's
 * NodeTypeEnrichmentServiceAspect substitutes for `label: i18n` /
 * `description: i18n`. The plugin API has no translation service, so this
 * fetches the same XLIFF-as-JSON bundle the shell itself loads, via
 * `window.__NEOS_STUDIO__` (a stable runtime global, not officially part of
 * the plugin API).
 */

type XliffBundle = Record<string, Record<string, Record<string, string | string[]>>>

declare global {
  interface Window {
    __NEOS_STUDIO__?: { xliffEndpoint?: string; interfaceLanguage?: string }
  }
}

let bundle: XliffBundle | null = null
const listeners = new Set<() => void>()

function load(): void {
  if (bundle !== null) return
  const endpoint = window.__NEOS_STUDIO__?.xliffEndpoint ?? '/neos/xliff.json'
  const locale = window.__NEOS_STUDIO__?.interfaceLanguage ?? 'en'
  fetch(`${endpoint}?locale=${encodeURIComponent(locale)}`, { credentials: 'include' })
    .then((response) => (response.ok ? response.json() : {}))
    .then((data: XliffBundle) => {
      bundle = data
      listeners.forEach((listener) => listener())
    })
    .catch(() => {
      bundle = {}
    })
}

load()

/**
 * Translate a "Package:Source:id" label; anything else passes through
 * unchanged. Plain function, not a hook - pair with {@link useI18nReady}
 * once per component to re-render once the bundle has loaded.
 */
export function translate(label: string | undefined): string | undefined {
  if (!label) return label
  const parts = label.split(':')
  if (parts.length < 3 || !bundle) return label
  const [packageKey, sourceName, ...idParts] = parts
  const value =
    bundle[packageKey.replace(/\./g, '_')]?.[sourceName.replace(/\./g, '_')]?.[
      idParts.join(':').replace(/\./g, '_')
    ]
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return label
}

/** Re-renders the calling component once the XLIFF bundle has loaded. */
export function useI18nReady(): void {
  const [, forceRender] = useState(0)
  useEffect(() => {
    if (bundle !== null) return
    const listener = () => forceRender((n) => n + 1)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])
}
