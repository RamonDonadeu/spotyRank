import type { Track } from './ranking/types.ts'

export const UNKNOWN_ALBUM_ID = '__unknown_album__'

export type AlbumTrackGroup = {
  albumId: string
  albumName: string
  imageUrl?: string
  tracks: Track[]
}

export function getTrackAlbumKey(track: Track): string {
  return track.albumId ?? UNKNOWN_ALBUM_ID
}

export function getTrackAlbumName(track: Track): string {
  if (track.albumId === UNKNOWN_ALBUM_ID || !track.albumId) {
    return track.albumName ?? ''
  }
  return track.albumName ?? ''
}

/** Groups tracks by album; sorts groups alphabetically by album name. */
export function groupTracksByAlbum(tracks: Track[]): AlbumTrackGroup[] {
  const map = new Map<string, AlbumTrackGroup>()

  for (const track of tracks) {
    const albumId = getTrackAlbumKey(track)
    let group = map.get(albumId)
    if (!group) {
      const displayName =
        albumId === UNKNOWN_ALBUM_ID
          ? ''
          : track.albumName?.trim() || ''
      group = {
        albumId,
        albumName: displayName,
        imageUrl: track.imageUrl,
        tracks: [],
      }
      map.set(albumId, group)
    }
    if (!group.imageUrl && track.imageUrl) {
      group.imageUrl = track.imageUrl
    }
    group.tracks.push(track)
  }

  const groups = [...map.values()]
  for (const group of groups) {
    if (group.albumId === UNKNOWN_ALBUM_ID && !group.albumName) {
      group.albumName = ''
    }
  }

  return groups.sort((a, b) => {
    const nameA = a.albumName || '\uffff'
    const nameB = b.albumName || '\uffff'
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
  })
}
