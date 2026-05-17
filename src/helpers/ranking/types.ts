export interface Track {
  id: string
  name: string
  artist: string
  /** Album art URL; UI falls back to a generated placeholder when omitted. */
  imageUrl?: string
  albumId?: string
  albumName?: string
}

/** Active placement search uses exclusive bounds [low, high). */
export interface PlacementRange {
  low: number
  high: number
}

export interface SegmentPivot {
  boundaryIndex: number
  track: Track | null
  /** 1-based index in the current sorted list (for labels). */
  positionInList: number | null
}

export interface SegmentPlacementQuestion {
  candidate: Track
  range: PlacementRange
  /** [low, b₁, b₂, b₃, b₄, high] insertion indices. */
  boundaries: number[]
  pivots: SegmentPivot[]
  buckets: PlacementRange[]
  round: number
  estimatedRoundsRemaining: number
}

export interface RankingState {
  selected: Track[]
  pool: Track[]
  sorted: Track[]
  currentCandidate: Track | null
  placementRange: PlacementRange | null
  placementRound: number
  placementQuestion: SegmentPlacementQuestion | null
  phase: 'select' | 'ranking' | 'done'
}
