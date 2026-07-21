import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { PropertyEditorProps } from '@medienreaktor/neos-studio'
import { Icons, PreviewImage } from './components'
import {
  computeColumns,
  cx,
  flattenValues,
  sortByPosition,
  styleOption,
  truthyOption,
  type ToggleItem,
} from './utils'

/**
 * Port of Beromir.ToggleEditor to the Neos Studio editor contract. One
 * component serves the inspector and the node creation dialog: a pick is a
 * discrete commit boundary, so every toggle calls onCommit (and onChange, so
 * the creation dialog's live validation stays current).
 *
 * Differences to the classic-UI original, dictated by the Studio plugin API:
 *  - the host renders the property label, so there is no label/Wrapper here
 *  - no unsaved-change highlighting (the classic `highlight` prop has no
 *    Studio equivalent - the inspector auto-saves on commit anyway)
 *  - data sources (dataSourceIdentifier / dataSourceUri) are not available
 *    to plugins; a configured one renders a hint instead of options
 *  - labels/descriptions are rendered as configured; i18n ids are not
 *    resolved (the plugin API exposes no translation service)
 */

const LAYOUTS = ['grid', 'flex', 'flex-start', 'list', 'color']

export function ToggleEditor({
  value,
  options: rawOptions,
  onCommit,
  onChange,
  autoFocus,
  invalid,
  subject,
}: PropertyEditorProps) {
  const layout =
    typeof rawOptions.layout === 'string' && LAYOUTS.includes(rawOptions.layout)
      ? rawOptions.layout
      : 'grid'
  const multiple = rawOptions.multiple === true
  // multiple implies allowEmpty - an array can always be emptied.
  const allowEmpty = multiple || truthyOption(rawOptions.allowEmpty)
  const emptyValue =
    typeof rawOptions.emptyValue === 'string' ? rawOptions.emptyValue : ''
  const iconSize =
    typeof rawOptions.iconSize === 'string' ? rawOptions.iconSize : null
  // The original documents `disable` but implements `disabled` - accept both.
  const editorDisabled =
    truthyOption(rawOptions.disabled) || truthyOption(rawOptions.disable)
  const editorHidden = truthyOption(rawOptions.hidden)
  const hasDataSource = Boolean(
    rawOptions.dataSourceIdentifier || rawOptions.dataSourceUri,
  )
  const wrapperCustomStyle = styleOption(rawOptions.wrapperCustomStyle)
  const buttonCustomStyle = styleOption(rawOptions.buttonCustomStyle)
  const labelCustomStyle = styleOption(rawOptions.labelCustomStyle)

  // The picked value(s), always held as an array; seeded from the stored
  // value (the host remounts on a subject change, which resets this).
  const [active, setActive] = useState<unknown[]>(() =>
    Array.isArray(value) ? value : value === undefined || value === null ? [] : [value],
  )

  const items = useMemo(
    () => sortByPosition(flattenValues(rawOptions.values, layout)),
    [rawOptions.values, layout],
  )

  const firstButton = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (autoFocus) firstButton.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    if (multiple && value !== undefined && value !== null && !Array.isArray(value)) {
      console.warn(
        `Misconfiguration in property "${subject.name}". Multiple is activated but value type seems to be "string" or "integer" but should be "array".`,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (editorHidden) {
    return null
  }

  if (hasDataSource) {
    return (
      <div className="btse-notice">
        Data sources are not supported by the Studio port of the toggle editor
        - configure editorOptions.values instead.
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="btse-notice btse-notice--error">
        No values defined for the toggle editor. Configure
        editorOptions.values in the node type definition.
      </div>
    )
  }

  const itemIsActive = (item: ToggleItem) => active.includes(item.value)

  function toggle(item: ToggleItem, node?: HTMLElement | null) {
    node?.blur()

    let activeItems = [...active]
    const alreadyActive = activeItems.includes(item.value)
    if (!multiple) {
      activeItems = alreadyActive ? [] : [item.value]
    } else if (alreadyActive) {
      activeItems.splice(activeItems.indexOf(item.value), 1)
    } else {
      activeItems.push(item.value)
    }

    // if allowEmpty is false but the new selection would be empty, drop the change
    if (!allowEmpty && activeItems.length === 0) {
      return
    }

    setActive(activeItems)

    const committed = multiple
      ? activeItems
      : activeItems.length
        ? activeItems[0]
        : emptyValue
    onChange?.(committed)
    onCommit(committed)
  }

  const columnsStyle =
    layout === 'grid' || layout === 'color'
      ? ({
          '--btse-columns': computeColumns(
            rawOptions.columns,
            rawOptions.maximalColumns,
            items.length,
          ),
        } as CSSProperties)
      : undefined

  const resetBadge = (item: ToggleItem, className = 'btse-allow-empty') =>
    allowEmpty && !multiple ? (
      <span
        className={cx(
          className,
          itemIsActive(item) && 'btse-allow-empty--show',
        )}
      >
        <i className="fa fa-times" aria-hidden />
      </span>
    ) : null

  return (
    <div
      className={cx(
        'btse',
        `btse--${layout}`,
        editorDisabled && 'btse--disabled',
      )}
      style={{ ...wrapperCustomStyle, ...columnsStyle }}
      aria-invalid={invalid || undefined}
    >
      {items.map((item, index) => {
        const isCurrent = itemIsActive(item)
        const itemDisabled = editorDisabled || truthyOption(item.disabled)
        const state = isCurrent ? 'active' : 'default'

        const label = (state === 'active' ? (item.labelActive ?? item.label) : item.label) as
          | string
          | undefined
        const description = (
          state === 'active'
            ? (item.descriptionActive ?? item.description)
            : item.description
        ) as string | undefined

        const title = description || label
        const ariaLabel = isCurrent && allowEmpty ? 'Reset' : title
        const buttonRef = index === 0 ? firstButton : undefined

        switch (layout) {
          case 'list':
            if (multiple) {
              return (
                <label
                  className={cx(
                    'btse-list-button',
                    itemDisabled && 'btse-item--disabled',
                  )}
                  title={description}
                  aria-label={ariaLabel}
                  style={item.buttonCustomStyle || buttonCustomStyle}
                  key={item.key}
                >
                  <input
                    type="checkbox"
                    className="btse-checkbox"
                    checked={isCurrent}
                    disabled={itemDisabled}
                    onChange={() => toggle(item)}
                  />
                  <Icons item={item} isCurrent={isCurrent} size={iconSize} />
                  <PreviewImage item={item} isCurrent={isCurrent} />
                  {label && (
                    <span
                      className="btse-flex1"
                      style={item.labelCustomStyle || labelCustomStyle}
                    >
                      {label}
                    </span>
                  )}
                </label>
              )
            }

            return (
              <button
                ref={buttonRef}
                onClick={({ currentTarget }) => toggle(item, currentTarget)}
                type="button"
                title={description}
                aria-label={ariaLabel}
                disabled={itemDisabled}
                className={cx(
                  'btse-list-button',
                  isCurrent && 'btse-list-button--selected',
                )}
                style={item.buttonCustomStyle || buttonCustomStyle}
                key={item.key}
              >
                <span className="btse-radio">
                  <span></span>
                </span>
                <Icons item={item} isCurrent={isCurrent} size={iconSize} />
                <PreviewImage item={item} isCurrent={isCurrent} />
                {label && (
                  <span
                    className="btse-flex1"
                    style={item.labelCustomStyle || labelCustomStyle}
                  >
                    {label}
                  </span>
                )}
                {resetBadge(item, 'btse-allow-empty-radio')}
              </button>
            )

          case 'color': {
            const colors = item.color ?? []
            const maxColorIndex = colors.length - 1
            return (
              <div className="btse-color-box" key={item.key}>
                <button
                  ref={buttonRef}
                  onClick={({ currentTarget }) => toggle(item, currentTarget)}
                  type="button"
                  title={title}
                  aria-label={ariaLabel}
                  disabled={itemDisabled}
                  className={cx(
                    'btse-color-button',
                    isCurrent && 'btse-color-button--selected',
                  )}
                  style={item.buttonCustomStyle || buttonCustomStyle}
                >
                  {colors.map((color, colorIndex) => (
                    <span
                      key={`color-${colorIndex}`}
                      className={cx(
                        'btse-color-preview',
                        color === 'transparent' && 'btse-color-transparent',
                        maxColorIndex === colorIndex &&
                          'btse-color-preview--last',
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  {resetBadge(item)}
                </button>
                {label && (
                  <span
                    className={cx(
                      'btse-color-label',
                      itemDisabled && 'btse-item--disabled',
                    )}
                  >
                    {label}
                  </span>
                )}
              </div>
            )
          }

          default:
            return (
              <button
                ref={buttonRef}
                onClick={() => toggle(item)}
                title={title}
                aria-label={ariaLabel}
                disabled={itemDisabled}
                className={cx(
                  'btse-button',
                  isCurrent && 'btse-button--current',
                )}
                style={item.buttonCustomStyle || buttonCustomStyle}
                key={item.key}
                type="button"
              >
                <Icons item={item} isCurrent={isCurrent} size={iconSize} />
                <PreviewImage item={item} isCurrent={isCurrent} />
                {label && (
                  <span
                    className={cx(
                      (item.icon || item.preview) && 'btse-label',
                    )}
                    style={item.labelCustomStyle || labelCustomStyle}
                  >
                    {label}
                  </span>
                )}
                {resetBadge(item)}
              </button>
            )
        }
      })}
    </div>
  )
}
