import { isPlacementComplete } from './placement'
import { estimateSegmentPlacementRounds } from './segmentPlacement'
import type { PlacementRange } from './types'

/** Seconds per placement step — scanning up to four reference songs per decision. */
export const SECONDS_PER_DECISION_MIN = 5
export const SECONDS_PER_DECISION_MAX = 10

export type TimeEstimateRange = {
  minSeconds: number
  maxSeconds: number
}

export function estimateComparisonsForOneInsertion(sortedLength: number): number {
  if (sortedLength < 1) return 0
  return estimateSegmentPlacementRounds(sortedLength + 1)
}

/** Total placement steps to rank `songCount` tracks (first needs none). */
export function estimateTotalComparisons(songCount: number): number {
  if (songCount <= 1) return 0
  let total = 0
  for (let sortedLength = 1; sortedLength < songCount; sortedLength++) {
    total += estimateComparisonsForOneInsertion(sortedLength)
  }
  return total
}

function comparisonsToSecondsRange(comparisons: number): TimeEstimateRange {
  return {
    minSeconds: comparisons * SECONDS_PER_DECISION_MIN,
    maxSeconds: comparisons * SECONDS_PER_DECISION_MAX,
  }
}

export function estimateTotalSecondsRange(songCount: number): TimeEstimateRange {
  return comparisonsToSecondsRange(estimateTotalComparisons(songCount))
}

export function estimateRemainingComparisons(params: {
  sortedLength: number
  placementRange: PlacementRange | null
  poolLength: number
  hasCurrentCandidate: boolean
}): number {
  const { sortedLength, placementRange, poolLength, hasCurrentCandidate } = params
  let remaining = 0

  if (
    hasCurrentCandidate &&
    placementRange &&
    !isPlacementComplete(placementRange)
  ) {
    remaining += estimateSegmentPlacementRounds(
      placementRange.high - placementRange.low,
    )
  }

  let listSize = sortedLength + (hasCurrentCandidate ? 1 : 0)
  for (let i = 0; i < poolLength; i++) {
    remaining += estimateComparisonsForOneInsertion(listSize)
    listSize += 1
  }

  return remaining
}

export function estimateRemainingSecondsRange(
  params: Parameters<typeof estimateRemainingComparisons>[0],
): TimeEstimateRange {
  return comparisonsToSecondsRange(estimateRemainingComparisons(params))
}
