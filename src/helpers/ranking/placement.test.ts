import { describe, expect, it } from 'vitest'
import {
  applySegmentChoiceFromQuestion,
  estimateSegmentPlacementRounds,
  getNextSegmentQuestion,
} from './segmentPlacement'
import {
  initialPlacementRange,
  insertAt,
  isPlacementComplete,
  resolvedInsertionIndex,
} from './placement'
import type { Track } from './types'

function track(id: string): Track {
  return { id, name: `Song ${id}`, artist: 'Artist' }
}

function tracks(ids: string[]): Track[] {
  return ids.map(track)
}

function placeByBuckets(
  sorted: Track[],
  candidate: Track,
  bucketChoices: number[],
): number {
  let range = initialPlacementRange(sorted.length)
  let round = 1
  for (const bucketIndex of bucketChoices) {
    const q = getNextSegmentQuestion(sorted, candidate, range, round)
    expect(q).not.toBeNull()
    range = applySegmentChoiceFromQuestion(q!, bucketIndex)
    round += 1
    if (isPlacementComplete(range)) break
  }
  expect(isPlacementComplete(range)).toBe(true)
  return resolvedInsertionIndex(range)
}

describe('estimateSegmentPlacementRounds', () => {
  it('returns 0 for range size <= 1', () => {
    expect(estimateSegmentPlacementRounds(1)).toBe(0)
  })

  it('uses log base 5', () => {
    expect(estimateSegmentPlacementRounds(20)).toBe(2)
    expect(estimateSegmentPlacementRounds(100)).toBe(3)
  })
})

describe('segment placement', () => {
  it('first song needs no question', () => {
    const range = initialPlacementRange(0)
    expect(isPlacementComplete(range)).toBe(true)
    expect(getNextSegmentQuestion([], track('x'), range)).toBeNull()
    expect(resolvedInsertionIndex(range)).toBe(0)
  })

  it('inserts at start of one-song list', () => {
    const sorted = tracks(['a'])
    const index = placeByBuckets(sorted, track('x'), [0])
    expect(index).toBe(0)
    expect(insertAt(sorted, track('x'), index).map((t) => t.id)).toEqual(['x', 'a'])
  })

  it('inserts at end of one-song list', () => {
    const sorted = tracks(['a'])
    const index = placeByBuckets(sorted, track('x'), [1])
    expect(index).toBe(1)
  })

  it('inserts in middle of two-song list', () => {
    const sorted = tracks(['a', 'b'])
    const index = placeByBuckets(sorted, track('x'), [1])
    expect(index).toBe(1)
    expect(insertAt(sorted, track('x'), index).map((t) => t.id)).toEqual(['a', 'x', 'b'])
  })

  it('inserts at end of two-song list', () => {
    const sorted = tracks(['a', 'b'])
    const index = placeByBuckets(sorted, track('x'), [2])
    expect(index).toBe(2)
  })

  it('uses four pivots for 20 songs (positions 4, 8, 12, 16)', () => {
    const sorted = Array.from({ length: 20 }, (_, i) => track(String(i + 1)))
    const q = getNextSegmentQuestion(sorted, track('new'), { low: 0, high: 21 })
    expect(q?.pivots.map((p) => p.positionInList)).toEqual([4, 8, 12, 16])
  })

  it('narrows to between 8 and 12 in two steps', () => {
    const sorted = Array.from({ length: 20 }, (_, i) => track(String(i + 1)))
    const index = placeByBuckets(sorted, track('new'), [2, 1])
    expect(index).toBe(9)
  })
})
