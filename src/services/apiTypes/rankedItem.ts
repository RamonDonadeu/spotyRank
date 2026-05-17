export type RankedItemType = 'track' | 'album' | 'artist'

/** One entry in the final ranked list shown on the completion screen. */
export type RankedItem = {
  id: string
  type: RankedItemType
  name: string
  subtitle?: string
  imageUrl?: string
}

/** When album/artist selection is expanded before ranking, attach the track id. */
export type RankedTrackItem = RankedItem & {
  type: 'track'
}

export function isRankedTrack(item: RankedItem): item is RankedTrackItem {
  return item.type === 'track'
}

/** Collect track ids in rank order (skips non-tracks). */
export function extractTrackIdsInOrder(items: readonly RankedItem[]): string[] {
  return items.filter(isRankedTrack).map((item) => item.id)
}
