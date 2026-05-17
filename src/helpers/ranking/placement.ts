import type { PlacementRange, Track } from './types'

export function initialPlacementRange(sortedLength: number): PlacementRange {
  return { low: 0, high: sortedLength + 1 }
}

export function isPlacementComplete(range: PlacementRange): boolean {
  return range.high - range.low <= 1
}

export function resolvedInsertionIndex(range: PlacementRange): number {
  return range.low
}

export function insertAt(sorted: Track[], candidate: Track, index: number): Track[] {
  const next = [...sorted]
  next.splice(index, 0, candidate)
  return next
}

export function hasDuplicateIds(tracks: Track[]): boolean {
  const seen = new Set<string>()
  for (const t of tracks) {
    if (seen.has(t.id)) return true
    seen.add(t.id)
  }
  return false
}
