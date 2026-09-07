import type { CSSProperties } from 'react'
import { translate } from './i18n'

/**
 * Ported from Beromir.ToggleEditor's utils.js. An item is one entry of
 * editorOptions.values, flattened to an array with its YAML key as `value`.
 * All fields are optional and come straight from node type configuration.
 */
export interface ToggleItem {
  /** The YAML key - what gets committed. */
  value: string
  /** React key; '__empty__' for the empty-string value. */
  key: string
  label?: string
  labelActive?: string
  description?: string
  descriptionActive?: string
  icon?: string
  iconActive?: string
  iconRotate?: number
  iconActiveRotate?: number
  preview?: string
  previewActive?: string
  previewRotate?: number
  previewActiveRotate?: number
  previewFull?: boolean
  /** Normalized by processColorValues to a non-empty array (color layout only). */
  color?: string[]
  hidden?: unknown
  disabled?: unknown
  position?: string | number
  buttonCustomStyle?: CSSProperties
  labelCustomStyle?: CSSProperties
  [key: string]: unknown
}

export interface ItemVariants<T = unknown> {
  default: T
  active: T
}

export interface IconOrPreviewConfig {
  type: 'icon' | 'preview'
  /** Both a default and an active variant exist - stack them to avoid layout jumps. */
  needLayering: boolean
  state: ItemVariants<string | undefined>
  label: ItemVariants<string | undefined> | null
  description: ItemVariants<string | undefined> | null
  rotate: ItemVariants<string | undefined> | null
}

/**
 * A config value that hides/disables something. The shell does not (yet)
 * resolve ClientEval expressions inside editorOptions, so an unresolved
 * "ClientEval:" string must not count as true - it would hide items the
 * classic UI shows.
 */
export function truthyOption(value: unknown): boolean {
  if (typeof value === 'string' && value.startsWith('ClientEval:')) return false
  return Boolean(value)
}

/**
 * The default/active pair of a per-item option: `<key><subkey>` and
 * `<key>Active<subkey>` (e.g. label/labelActive, iconRotate/iconActiveRotate).
 */
export function getItemVariants<T = unknown>(
  item: ToggleItem,
  key: string,
  activeFallbackToDefault = false,
  processItem: (value: unknown) => T = (value) => value as T,
  subkey = '',
): ItemVariants<T> | null {
  const defaultItem = item[key + subkey]
  let activeItem = item[`${key}Active${subkey}`]

  if (activeFallbackToDefault && activeItem === undefined) {
    activeItem = defaultItem
  }

  if (defaultItem == undefined && activeItem == undefined) {
    return null
  }

  return {
    default: processItem(defaultItem),
    active: processItem(activeItem),
  }
}

/** editorOptions.values (a map keyed by stored value) as a filtered array. */
export function flattenValues(values: unknown, layout: string): ToggleItem[] {
  if (!values || typeof values !== 'object') {
    return []
  }

  const array: ToggleItem[] = []

  for (const [value, config] of Object.entries(
    values as Record<string, unknown>,
  )) {
    if (config === null || typeof config !== 'object') continue
    const item = config as Record<string, unknown>
    if (truthyOption(item.hidden)) continue
    array.push({
      ...item,
      value,
      key: value === '' ? '__empty__' : value,
    } as ToggleItem)
  }

  if (layout === 'color') {
    return processColorValues(array)
  }
  return array
}

/** Normalize each item's `color` to a non-empty string array; drop items without one. */
export function processColorValues(values: ToggleItem[]): ToggleItem[] {
  return values
    .map((item) => ({ ...item, color: processColor(item.color) }))
    .filter((item): item is ToggleItem & { color: string[] } =>
      Boolean(item.color),
    )
}

function processColor(color: unknown): string[] | undefined {
  if (!color || (typeof color !== 'string' && !Array.isArray(color))) {
    return undefined
  }
  if (typeof color === 'string') {
    return [color]
  }
  const filtered = color.filter(
    (entry): entry is string => typeof entry === 'string' && entry !== '',
  )
  return filtered.length ? filtered : undefined
}

export const getIconConfig = (item: ToggleItem) =>
  getIconOrPreviewConfig('icon', item)
export const getPreviewConfig = (item: ToggleItem) =>
  getIconOrPreviewConfig('preview', item)

function getIconOrPreviewConfig(
  type: 'icon' | 'preview',
  item: ToggleItem,
): IconOrPreviewConfig | null {
  const state = getItemVariants<string | undefined>(item, type, false, (v) =>
    typeof v === 'string' ? v : undefined,
  )
  if (!state) {
    return null
  }

  return {
    type,
    needLayering: Boolean(state.default && state.active),
    state,
    rotate: getItemVariants<string>(
      item,
      type,
      true,
      (value) => `rotate(${typeof value === 'number' ? value : 0}deg)`,
      'Rotate',
    ),
    label: getItemVariants<string | undefined>(item, 'label', true, (v) =>
      typeof v === 'string' ? translate(v) : undefined,
    ),
    description: getItemVariants<string | undefined>(
      item,
      'description',
      true,
      (v) => (typeof v === 'string' ? translate(v) : undefined),
    ),
  }
}

/**
 * Sorting by Neos/Flow "position" values - the same pragmatic subset the
 * Studio shell implements (numbers, "start [weight]", "end [weight]",
 * "before <key>", "after <key>"); entries without a position keep their
 * declaration order.
 */
type ParsedPosition =
  | { kind: 'middle'; value: number }
  | { kind: 'start' | 'end'; weight: number }
  | { kind: 'before' | 'after'; reference: string }

function parsePosition(
  position: string | number | undefined,
  declarationIndex: number,
): ParsedPosition {
  if (position === null || position === undefined)
    return { kind: 'middle', value: declarationIndex }
  if (typeof position === 'number') return { kind: 'middle', value: position }
  const trimmed = String(position).trim()
  if (/^-?\d+$/.test(trimmed))
    return { kind: 'middle', value: parseInt(trimmed, 10) }
  const [word, argument] = trimmed.split(/\s+/, 2)
  if (word === 'start' || word === 'end') {
    return {
      kind: word,
      weight: argument !== undefined ? parseInt(argument, 10) || 0 : 0,
    }
  }
  if ((word === 'before' || word === 'after') && argument) {
    return { kind: word, reference: argument }
  }
  return { kind: 'middle', value: declarationIndex }
}

export function sortByPosition(items: ToggleItem[]): ToggleItem[] {
  const parsed = items.map((item, index) => ({
    item,
    spec: parsePosition(item.position, index),
  }))

  const starts = parsed.filter((p) => p.spec.kind === 'start')
  const middles = parsed.filter((p) => p.spec.kind === 'middle')
  const ends = parsed.filter((p) => p.spec.kind === 'end')

  // Stable sorts - ties keep declaration order.
  const ordered = [
    ...starts.sort(
      (a, b) =>
        (b.spec as { weight: number }).weight -
        (a.spec as { weight: number }).weight,
    ),
    ...middles.sort(
      (a, b) =>
        (a.spec as { value: number }).value -
        (b.spec as { value: number }).value,
    ),
    ...ends.sort(
      (a, b) =>
        (a.spec as { weight: number }).weight -
        (b.spec as { weight: number }).weight,
    ),
  ].map((p) => p.item)

  for (const { item, spec } of parsed) {
    if (spec.kind !== 'before' && spec.kind !== 'after') continue
    const referenceIndex = ordered.findIndex((o) => o.key === spec.reference)
    if (referenceIndex === -1) {
      if (spec.kind === 'before') ordered.unshift(item)
      else ordered.push(item)
    } else {
      ordered.splice(
        spec.kind === 'before' ? referenceIndex : referenceIndex + 1,
        0,
        item,
      )
    }
  }

  return ordered
}

/**
 * The columns/maximalColumns options: a number, or an expression like
 * "{items} / 2" ({maximalColumns} is also substituted for `columns`),
 * surrounded by Math.floor - the original editor's contract.
 */
function convertToColumns(
  value: unknown,
  items: number,
  maximalColumns?: number,
): number | undefined {
  if (typeof value === 'number') {
    return value > 0 ? Math.floor(value) : undefined
  }
  if (!value || typeof value !== 'string') {
    return undefined
  }
  try {
    let expression = value.replaceAll('{items}', String(items))
    if (maximalColumns !== undefined) {
      expression = expression.replaceAll(
        '{maximalColumns}',
        String(maximalColumns),
      )
    }
    // eslint-disable-next-line no-new-func
    const result = new Function(`return Math.floor(${expression})`)()
    return typeof result === 'number' && Number.isFinite(result) && result > 0
      ? result
      : undefined
  } catch (e) {
    console.warn(`An error occurred while trying to evaluate "${value}"\n`, e)
    return undefined
  }
}

/** The effective column count: min(columns, maximalColumns), defaulting to one row of all items capped at maximalColumns. */
export function computeColumns(
  columns: unknown,
  maximalColumns: unknown,
  itemCount: number,
): number {
  const items = itemCount || 1
  const evaluatedMax = convertToColumns(maximalColumns, items) ?? 4
  const evaluated = convertToColumns(columns, items, evaluatedMax) ?? items
  return Math.max(1, Math.min(evaluated, evaluatedMax))
}

/**
 * Neos configures icons as Font Awesome names; Studio ships the FA free
 * webfonts (solid + regular + v4 shims), so configured names render verbatim.
 * Same resolution rules as the shell's faClassName.
 */
export function faClassName(configured: string): string {
  const icon = configured.trim()
  // Full FA class list ("fas fa-file", "fa-solid fa-file") - use as-is.
  if (icon.includes(' ')) return icon.replace('fas', 'fa')
  // Legacy Neos "icon-file" syntax (FA3/4 era) - the v4 shims resolve names.
  if (icon.startsWith('icon-')) return `fa fa-${icon.slice(5)}`
  // Bare name with or without fa- prefix.
  return icon.startsWith('fa-') ? `fa ${icon}` : `fa fa-${icon}`
}

/** A minimal clsx. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** A style object from editorOptions (wrapper/button/labelCustomStyle), or undefined. */
export function styleOption(value: unknown): CSSProperties | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as CSSProperties)
    : undefined
}
