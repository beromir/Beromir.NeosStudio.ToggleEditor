import type { CSSProperties } from 'react'
import {
  cx,
  faClassName,
  getIconConfig,
  getPreviewConfig,
  type ToggleItem,
} from './utils'

/**
 * A Font Awesome icon from a configured name. The Studio shell loads the FA
 * free webfonts globally, so an <i> with the resolved class renders without
 * this plugin shipping any icon assets. iconSize maps to FA's native sizing
 * classes (fa-xs ... fa-3x), like the classic UI's Icon size prop.
 */
const ICON_SIZES = ['xs', 'sm', 'lg', '2x', '3x']

function FaIcon({
  icon,
  size,
  style,
}: {
  icon: string
  size?: string | null
  style?: CSSProperties
}) {
  return (
    <i
      className={cx(
        'btse-icon btse-transition',
        faClassName(icon),
        size && ICON_SIZES.includes(size) && `fa-${size}`,
      )}
      style={style}
      aria-hidden
    />
  )
}

/**
 * The item's icon / iconActive pair. When both are set they are stacked and
 * cross-faded so the button never jumps; a single one shows permanently
 * (default) or only while active (iconActive). Rotation comes from
 * iconRotate / iconActiveRotate.
 */
export function Icons({
  item,
  size,
  isCurrent,
}: {
  item: ToggleItem
  size?: string | null
  isCurrent: boolean
}) {
  const config = getIconConfig(item)
  if (!config) {
    return null
  }

  const { state, rotate, needLayering } = config

  if (needLayering) {
    return (
      <span className="btse-layered">
        <FaIcon
          icon={state.default!}
          size={size}
          style={{ opacity: isCurrent ? 0 : 1, transform: rotate?.default }}
        />
        <FaIcon
          icon={state.active!}
          size={size}
          style={{ opacity: isCurrent ? 1 : 0, transform: rotate?.active }}
        />
      </span>
    )
  }

  if (state.default) {
    return (
      <FaIcon
        icon={state.default}
        size={size}
        style={{ transform: isCurrent ? rotate?.active : rotate?.default }}
      />
    )
  }

  if (state.active && isCurrent) {
    return (
      <FaIcon icon={state.active} size={size} style={{ transform: rotate?.active }} />
    )
  }

  return null
}

/**
 * One preview: either inline SVG markup (a string starting with "<svg ") or
 * an image URL; resource:// paths resolve to the published static resource
 * URL, same as the original editor.
 */
function SinglePreview({
  src,
  full,
  style,
  label,
}: {
  src: string
  full?: boolean
  style?: CSSProperties
  label?: string
}) {
  if (src.startsWith('<svg ')) {
    return (
      <span
        className={cx('btse-transition btse-image-svg', full && 'btse-image--full')}
        style={style}
        role="img"
        aria-label={label}
        dangerouslySetInnerHTML={{ __html: src }}
      />
    )
  }

  return (
    <img
      className={cx('btse-transition btse-image', full && 'btse-image--full')}
      style={style}
      alt={label ?? ''}
      src={
        src.startsWith('resource://')
          ? `/_Resources/Static/Packages/${src.slice(11)}`
          : src
      }
    />
  )
}

/** The item's preview / previewActive pair - same layering rules as Icons. */
export function PreviewImage({
  item,
  isCurrent,
}: {
  item: ToggleItem
  isCurrent: boolean
}) {
  const config = getPreviewConfig(item)
  if (!config) {
    return null
  }
  const { state, rotate, needLayering, label, description } = config
  const full = item.previewFull === true

  if (needLayering) {
    return (
      <span className="btse-layered">
        <SinglePreview
          src={state.default!}
          full={full}
          style={{ opacity: isCurrent ? 0 : 1, transform: rotate?.default }}
          label={description?.default || label?.default}
        />
        <SinglePreview
          src={state.active!}
          full={full}
          style={{ opacity: isCurrent ? 1 : 0, transform: rotate?.active }}
          label={description?.active || label?.active}
        />
      </span>
    )
  }

  if (state.default) {
    return (
      <SinglePreview
        src={state.default}
        full={full}
        style={{ transform: isCurrent ? rotate?.active : rotate?.default }}
        label={description?.default || label?.default}
      />
    )
  }

  if (state.active && isCurrent) {
    return (
      <SinglePreview
        src={state.active}
        full={full}
        style={{ transform: rotate?.active }}
        label={description?.active || label?.active}
      />
    )
  }

  return null
}
