import { describe, expect, it } from 'vitest'
import { initialPlacementRange } from './placement'
import type { Track } from './types'

function track(id: string): Track {
  return { id, name: id, artist: 'A' }
}

/** Mirrors undoLastPlacement session logic for tests. */
function applyUndo(params: {
  sorted: Track[]
  pool: Track[]
  currentCandidate: Track | null
  placementHistory: Track[]
}) {
  const { sorted, pool, currentCandidate, placementHistory } = params
  if (placementHistory.length === 0) return null

  const lastPlaced = placementHistory[placementHistory.length - 1]!
  const newHistory = placementHistory.slice(0, -1)
  const newSorted = sorted.filter((t) => t.id !== lastPlaced.id)
  const newPool = currentCandidate ? [currentCandidate, ...pool] : pool

  return {
    sorted: newSorted,
    pool: newPool,
    currentCandidate: lastPlaced,
    placementHistory: newHistory,
    placementRange: initialPlacementRange(newSorted.length),
  }
}

describe('undo last placement', () => {
  it('removes the last placed track by id, not the tail of the ranking', () => {
    const result = applyUndo({
      sorted: [track('a'), track('x'), track('b')],
      pool: [track('d')],
      currentCandidate: track('e'),
      placementHistory: [track('x'), track('b')],
    })

    expect(result?.sorted.map((t) => t.id)).toEqual(['a', 'x'])
    expect(result?.currentCandidate.id).toBe('b')
    expect(result?.pool.map((t) => t.id)).toEqual(['e', 'd'])
  })

  it('cannot undo with empty placement history', () => {
    expect(
      applyUndo({
        sorted: [track('a')],
        pool: [track('b')],
        currentCandidate: track('b'),
        placementHistory: [],
      }),
    ).toBeNull()
  })
})
