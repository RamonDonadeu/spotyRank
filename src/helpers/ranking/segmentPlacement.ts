import type { PlacementRange, SegmentPlacementQuestion, Track } from './types'

export const SEGMENT_BUCKET_COUNT = 5

export function estimateSegmentPlacementRounds(rangeSize: number): number {
  if (rangeSize <= 1) return 0
  return Math.ceil(Math.log(rangeSize) / Math.log(SEGMENT_BUCKET_COUNT))
}

/** [low, …interior, high] with up to five buckets (four pivots when span ≥ 5). */
export function computeSegmentBoundaries(low: number, high: number): number[] {
  const span = high - low
  if (span <= 1) return [low, high]

  const numBuckets = Math.min(SEGMENT_BUCKET_COUNT, span)
  const boundaries: number[] = [low]

  for (let k = 1; k < numBuckets; k++) {
    boundaries.push(low + Math.floor((span * k) / numBuckets))
  }

  for (let i = 1; i < boundaries.length; i++) {
    if (boundaries[i]! <= boundaries[i - 1]!) {
      boundaries[i] = boundaries[i - 1]! + 1
    }
  }

  boundaries.push(high)

  if (boundaries[boundaries.length - 2]! >= high) {
    boundaries[boundaries.length - 2] = high - 1
  }

  return boundaries
}

function pivotTrackAtBoundary(sortedTracks: Track[], boundary: number): Track | null {
  if (boundary <= 0 || sortedTracks.length === 0) return null
  const index = Math.min(boundary - 1, sortedTracks.length - 1)
  return sortedTracks[index] ?? null
}

export function getNextSegmentQuestion(
  sortedTracks: Track[],
  candidate: Track,
  range: PlacementRange,
  round = 1,
): SegmentPlacementQuestion | null {
  const span = range.high - range.low
  if (span <= 1) return null

  const boundaries = computeSegmentBoundaries(range.low, range.high)
  const pivots = boundaries.slice(1, -1).map((boundaryIndex) => ({
    boundaryIndex,
    track: pivotTrackAtBoundary(sortedTracks, boundaryIndex),
    positionInList: boundaryIndex > 0 ? boundaryIndex : null,
  }))

  const buckets: PlacementRange[] = []
  for (let i = 0; i < boundaries.length - 1; i++) {
    buckets.push({ low: boundaries[i]!, high: boundaries[i + 1]! })
  }

  return {
    candidate,
    range,
    boundaries,
    pivots,
    buckets,
    round,
    estimatedRoundsRemaining: estimateSegmentPlacementRounds(span),
  }
}

export function applySegmentChoice(
  boundaries: number[],
  bucketIndex: number,
): PlacementRange {
  return {
    low: boundaries[bucketIndex] ?? boundaries[0]!,
    high: boundaries[bucketIndex + 1] ?? boundaries[boundaries.length - 1]!,
  }
}

export function applySegmentChoiceFromQuestion(
  question: SegmentPlacementQuestion,
  bucketIndex: number,
): PlacementRange {
  const bucket = question.buckets[bucketIndex]
  if (bucket && bucket.high > bucket.low) return bucket
  return applySegmentChoice(question.boundaries, bucketIndex)
}
