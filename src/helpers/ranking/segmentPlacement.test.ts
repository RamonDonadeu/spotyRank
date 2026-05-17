import { describe, expect, it } from 'vitest'
import {
  applySegmentChoice,
  applySegmentChoiceFromQuestion,
  computeSegmentBoundaries,
  estimateSegmentPlacementRounds,
  getNextSegmentQuestion,
} from './segmentPlacement'
import type { Track } from './types'

function track(id: string): Track {
  return { id, name: `Song ${id}`, artist: 'Artist' }
}

describe('computeSegmentBoundaries', () => {
  it('splits 21 insertion slots for 20 sorted songs (4, 8, 12, 16 pivots)', () => {
    expect(computeSegmentBoundaries(0, 21)).toEqual([0, 4, 8, 12, 16, 21])
  })

  it('splits a narrowed range (24, 28, 32, 36 for span 20)', () => {
    expect(computeSegmentBoundaries(20, 40)).toEqual([20, 24, 28, 32, 36, 40])
  })
})

describe('getNextSegmentQuestion', () => {
  it('returns four pivot positions for 20 sorted songs', () => {
    const sorted = Array.from({ length: 20 }, (_, i) => track(String(i + 1)))
    const q = getNextSegmentQuestion(sorted, track('new'), { low: 0, high: 21 })
    expect(q).not.toBeNull()
    expect(q!.pivots.map((p) => p.positionInList)).toEqual([4, 8, 12, 16])
    expect(q!.pivots[0]?.track?.id).toBe('4')
    expect(q!.buckets).toHaveLength(5)
  })

  it('narrows range after bucket choice', () => {
    const sorted = Array.from({ length: 20 }, (_, i) => track(String(i + 1)))
    const q = getNextSegmentQuestion(sorted, track('new'), { low: 0, high: 21 })!
    const between8and12 = applySegmentChoice(q.boundaries, 2)
    expect(between8and12).toEqual({ low: 8, high: 12 })

    const q2 = getNextSegmentQuestion(sorted, track('new'), between8and12)!
    expect(q2.pivots.map((p) => p.positionInList)).toEqual([9, 10, 11])
  })
})

describe('estimateSegmentPlacementRounds', () => {
  it('uses log base 5', () => {
    expect(estimateSegmentPlacementRounds(20)).toBe(2)
    expect(estimateSegmentPlacementRounds(100)).toBe(3)
  })
})

describe('applySegmentChoiceFromQuestion', () => {
  it('uses bucket list from question', () => {
    const sorted = Array.from({ length: 5 }, (_, i) => track(String(i)))
    const q = getNextSegmentQuestion(sorted, track('x'), { low: 0, high: 6 })!
    const next = applySegmentChoiceFromQuestion(q, 0)
    expect(next.low).toBeLessThan(next.high)
  })
})
