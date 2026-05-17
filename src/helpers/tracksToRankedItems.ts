import type { Track } from './ranking/types.ts'
import type { RankedItem } from '../services/apiTypes/rankedItem.ts'

export function tracksToRankedItems(tracks: readonly Track[]): RankedItem[] {
  return tracks.map((track) => ({
    id: track.id,
    type: 'track' as const,
    name: track.name,
    subtitle: track.artist,
    imageUrl: track.imageUrl,
  }))
}
