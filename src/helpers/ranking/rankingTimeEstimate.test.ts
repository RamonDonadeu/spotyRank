import { describe, expect, it } from 'vitest'
import {
  estimateRemainingComparisons,
  estimateRemainingSecondsRange,
  estimateTotalComparisons,
  estimateTotalSecondsRange,
  SECONDS_PER_DECISION_MAX,
  SECONDS_PER_DECISION_MIN,
} from './rankingTimeEstimate'

describe('rankingTimeEstimate', () => {
  it('totals placement steps for n songs', () => {
    expect(estimateTotalComparisons(1)).toBe(0)
    expect(estimateTotalComparisons(20)).toBe(34)
    expect(estimateTotalComparisons(100)).toBe(269)
  })

  it('converts comparisons to a 5–10 s range per decision', () => {
    const range = estimateTotalSecondsRange(20)
    expect(range.minSeconds).toBe(34 * SECONDS_PER_DECISION_MIN)
    expect(range.maxSeconds).toBe(34 * SECONDS_PER_DECISION_MAX)
  })

  it('shrinks remaining as list is ranked', () => {
    const full = estimateRemainingComparisons({
      sortedLength: 1,
      placementRange: { low: 0, high: 21 },
      poolLength: 18,
      hasCurrentCandidate: true,
    })
    const afterSome = estimateRemainingComparisons({
      sortedLength: 10,
      placementRange: { low: 4, high: 9 },
      poolLength: 9,
      hasCurrentCandidate: true,
    })
    expect(afterSome).toBeLessThan(full)

    const fullRange = estimateRemainingSecondsRange({
      sortedLength: 1,
      placementRange: { low: 0, high: 21 },
      poolLength: 18,
      hasCurrentCandidate: true,
    })
    const afterRange = estimateRemainingSecondsRange({
      sortedLength: 10,
      placementRange: { low: 4, high: 9 },
      poolLength: 9,
      hasCurrentCandidate: true,
    })
    expect(afterRange.maxSeconds).toBeLessThan(fullRange.maxSeconds)
  })
})
