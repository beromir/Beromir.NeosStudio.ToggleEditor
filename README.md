# Beromir.NeosStudio.ToggleEditor

The toggle editor for **Neos Studio** (`Medienreaktor.NeosStudio`). It lets
you select one — or, with `multiple`, several — of a set of configured values,
rendered as a button group, a radio/checkbox list or color swatches.

The editor registers as `Beromir.ToggleEditor/Editor`. The
[Beromir.ToggleEditor](https://github.com/beromir/Beromir.ToggleEditor)
package provides the same editor for the classic Neos UI under the same id;
both can be installed side by side, so one node type configuration serves
both interfaces.

## Layouts

- **grid** (default): buttons in a grid; `columns` / `maximalColumns` control
  the wrapping
- **flex**: one row, buttons share the available width
- **flex-start**: buttons wrap, left-aligned, natural width
- **list**: a vertical list — radio buttons, or checkboxes with `multiple`
- **color**: color swatches (one or several colors per swatch, `transparent`
  renders a checkerboard) with the label below

## Installation

Run the following command in your site package:

```bash
composer require --no-update beromir/neos-studio-toggle-editor
```

Then run `composer update` in your project root and flush the Flow caches.

## Configuration

Add a property of type `string` (or `array` for `multiple`) to your node type
definition:

```yaml
properties:
  alignment:
    # If multiple is true, this must be array, otherwise string
    type: string
    defaultValue: 'left'
    ui:
      label: 'Alignment'
      reloadIfChanged: true
      inspector:
        editor: 'Beromir.ToggleEditor/Editor'
        editorOptions:
          # One of 'grid', 'flex', 'flex-start', 'list' or 'color'. Default: 'grid'
          layout: 'grid'

          # Number of columns, for the 'grid' and 'color' layouts only.
          # Can also be an expression like '{items} / 2', which is surrounded
          # by Math.floor. Available placeholders: {items} = number of values,
          # {maximalColumns} = the evaluated maximalColumns.
          # The smaller of columns and maximalColumns wins.
          columns: 2

          # Alternatively, the maximum number of columns ('grid' and 'color'
          # only). Defaults to 4. Accepts the same expressions ({items}).
          maximalColumns: 4

          # Allow deselecting the active value by clicking it again
          allowEmpty: true

          # Value committed when the selection is emptied. Default: ''
          # Has no effect in multiple mode.
          emptyValue: 'none'

          # Multi-select. The property type must be array. The selection can
          # always be emptied - allowEmpty is implied.
          multiple: false

          # Icon size: 'xs', 'sm', 'lg', '2x' or '3x'. Default: null
          iconSize: 'lg'

          # Disable the whole editor
          disabled: false

          # Hide the whole editor
          hidden: false

          # Custom styles for the wrapper
          wrapperCustomStyle:
            gap: '4px'

          # Custom styles for all buttons
          buttonCustomStyle:
            borderRadius: '2px'

          # Custom styles for all labels (not used by the 'color' layout)
          labelCustomStyle:
            fontSize: '15px'

          values:
            left:
              # The label, and an alternative label while the value is active
              label: 'Left'
              labelActive: 'Item is left'

              # Tooltip, and an alternative tooltip while active
              description: 'Align left'
              descriptionActive: 'Item is left aligned'

              # Font Awesome icon, and an alternative icon while active.
              # Not used by the 'color' layout.
              icon: 'align-left'
              iconActive: 'align-right'
              # Rotate the icon (in degrees), optionally different while active
              iconRotate: -45
              iconActiveRotate: 0

              # Preview image: a URL, a 'resource://…' path or inline
              # '<svg …' markup; previewActive swaps it while active.
              # Not used by the 'color' layout.
              preview: 'resource://Vendor.Package/Public/Images/left.png'
              previewActive: 'resource://Vendor.Package/Public/Images/left-active.png'
              # Rotate the preview (in degrees), optionally different while active
              previewRotate: -45
              previewActiveRotate: 0
              # If true and no label is set, the preview fills the whole button
              previewFull: true

              # Only for the 'color' layout: the swatch. One color, or several
              # rendered side by side (useful for light/dark mode values);
              # 'transparent' renders a visible checkerboard.
              color: ['#ffffff', '#000000']

              # Hide or disable this single value
              hidden: false
              disabled: false

              # Custom styles for this button / this label
              buttonCustomStyle:
                borderRadius: '2px'
              labelCustomStyle:
                fontSize: '15px'
            center:
              label: 'Center'
              icon: 'align-center'
              # Order the values with Fusion @position semantics: a number,
              # 'start', 'end', 'before <key>' or 'after <key>'
              position: 10
            right:
              label: 'Right'
              icon: 'align-right'
```

## Limitations

- **`dataSourceUri` is not supported** - a free-form URL bypassing the data
  source registry, same as Studio's own `DataSourceWidget`. Register a data
  source and reference it via `dataSourceIdentifier` instead, which works.
- **ClientEval expressions** in editor options are not evaluated; a
  `ClientEval:` string in `hidden` / `disabled` is treated as false instead of
  misinterpreted as true.

`dataSourceIdentifier` and i18n (`label: i18n` / `description: i18n`) are
supported:

- Values are loaded via the plugin API's `apiFetch` against the same
  `/data-sources/{id}` endpoint the shell's own select-box views use -
  `dataSourceAdditionalData` and `dataSourceDisableCaching` are forwarded.
  Both response shapes Neos data sources return (an array of `{value,
  label, ...}` entries, or a map of `{key: {label, ...}}`) are handled.
- Translation ids are resolved via the same XLIFF-as-JSON endpoint the
  shell itself loads (`window.__NEOS_STUDIO__.xliffEndpoint` - a stable
  runtime global, not (yet) part of the published plugin API, but set
  before any plugin script runs). The package's own UI strings (loading /
  reset / error messages) reuse `beromir/neos-toggle-editor`'s existing
  translations when that package is installed, falling back to English
  literals otherwise.
- Colors set as CSS custom properties (`color: "var(--x)"`, common for
  project design tokens) are resolved live from the preview iframe's
  document, since the Studio shell's own document never loads the site's
  CSS and a plain `var(...)` there would resolve to nothing.

## Building

The bundle is prebuilt into `Resources/Public/Plugin/`. To rebuild:

```bash
cd Resources/Private/Plugin
npm install
npm run build        # emits Resources/Public/Plugin/{plugin.js,plugin.css}
```

Then flush Flow caches and reload `/neos/studio`. Use `npm run dev` to rebuild
on change while developing.

Note: `@medienreaktor/neos-studio` (type declarations of the Studio plugin
API) is a `file:` dependency pointing at the installed
`Medienreaktor.NeosStudio` package under `Packages/Application/`. If your
Studio package lives elsewhere, adjust the path in
`Resources/Private/Plugin/package.json`.

## License

This package is free software, released under the
[GNU General Public License, version 3 or later](LICENSE).
