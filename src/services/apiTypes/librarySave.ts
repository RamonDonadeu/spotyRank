export type LibrarySaveKind = 'tracks' | 'albums' | 'artists'

export type LibrarySaveBatchResult = {
  kind: LibrarySaveKind
  ids: string[]
  ok: boolean
  status?: number
  message?: string
}

export type LibrarySaveResult = {
  savedCount: number
  totalCount: number
  batches: LibrarySaveBatchResult[]
  partialFailure: boolean
}
