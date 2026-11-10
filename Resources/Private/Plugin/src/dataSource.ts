import { useEffect, useState } from 'react'
import { apiFetch, type NodeAddress } from '@medienreaktor/neos-studio'
import type { ToggleItem } from './utils'

/**
 * `editorOptions.dataSourceIdentifier` loads values from a Neos data source
 * via the plugin API's `apiFetch`, against Neos.Api's `/datasources/{id}`
 * operation (getDataSourceData) Studio's own select-box views use. No react-query - a second
 * bundled copy wouldn't see the shell's QueryClientProvider - so this is a
 * plain fetch-on-change effect instead.
 */

/** PHP-parseable query params (bracket notation for nesting), mirroring the shell's appendParam. */
function appendParam(search: URLSearchParams, key: string, value: unknown): void {
  if (value === null || value === undefined) return
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendParam(search, `${key}[${index}]`, item))
  } else if (typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      appendParam(search, `${key}[${childKey}]`, childValue)
    }
  } else {
    search.append(key, String(value))
  }
}

export interface DataSourceState {
  isLoading: boolean
  error: string | null
  items: ToggleItem[] | null
}

/** Data sources return either an array of {value, label?, ...} entries, or a map of {key: {label?, ...}}. */
function normalize(data: unknown): ToggleItem[] {
  if (data === null || typeof data !== 'object') return []

  const toItem = (value: unknown, entry: Record<string, unknown>): ToggleItem => ({
    ...entry,
    value: String(value),
    key: value === '' || value === undefined ? '__empty__' : String(value),
  })

  return Array.isArray(data)
    ? data
        .filter((entry): entry is Record<string, unknown> => entry !== null && typeof entry === 'object')
        .map((entry) => toItem(entry.value, entry))
    : Object.entries(data).map(([key, entry]) =>
        toItem(key, entry !== null && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}),
      )
}

export function useToggleDataSource(
  identifier: string | null,
  nodeAddress: NodeAddress | undefined,
  additionalData: Record<string, unknown> | undefined,
  disableCaching: boolean,
): DataSourceState {
  const [state, setState] = useState<DataSourceState>({
    isLoading: identifier !== null,
    error: null,
    items: null,
  })

  useEffect(() => {
    if (identifier === null) {
      setState({ isLoading: false, error: null, items: null })
      return
    }

    let cancelled = false
    setState((previous) => ({ ...previous, isLoading: true, error: null }))

    const search = new URLSearchParams()
    appendParam(search, 'arguments', additionalData)
    if (nodeAddress) {
      search.set('contentRepositoryId', nodeAddress.contentRepositoryId)
      search.set('nodeAggregateId', nodeAddress.nodeAggregateId)
      search.set('workspaceName', nodeAddress.workspaceName)
      search.set('dimensionSpacePoint', nodeAddress.dimensionSpacePoint)
    }
    const query = search.toString()

    apiFetch<{ data: unknown }>(`/datasources/${encodeURIComponent(identifier)}${query ? `?${query}` : ''}`)
      .then((response) => {
        if (cancelled) return
        setState({ isLoading: false, error: null, items: normalize(response.data) })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setState({
          isLoading: false,
          error: error instanceof Error ? error.message : String(error),
          items: null,
        })
      })

    return () => {
      cancelled = true
    }
  }, [
    identifier,
    nodeAddress?.contentRepositoryId,
    nodeAddress?.nodeAggregateId,
    nodeAddress?.workspaceName,
    nodeAddress?.dimensionSpacePoint,
    JSON.stringify(additionalData ?? {}),
    disableCaching,
  ])

  return state
}
