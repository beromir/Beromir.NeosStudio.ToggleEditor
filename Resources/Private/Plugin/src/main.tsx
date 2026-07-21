import { editors } from '@medienreaktor/neos-studio'
import { ToggleEditor } from './ToggleEditor'
import './plugin.css'

/**
 * Plugin entry point. The StudioController injects this bundle as a deferred
 * `type="module"` tag after the shell's own module, so by the time this runs
 * the shell has installed its globals, registered its built-ins and mounted.
 *
 * The editor registers under the ORIGINAL Beromir.ToggleEditor id on purpose:
 * node type configuration written for the classic UI
 * (`editor: 'Beromir.ToggleEditor/Editor'`) lights up in Studio unchanged.
 * Both packages can be installed side by side - the original serves the
 * classic UI, this port serves Studio.
 */
editors.register({
  id: 'Beromir.ToggleEditor/Editor',
  component: ToggleEditor,
})
