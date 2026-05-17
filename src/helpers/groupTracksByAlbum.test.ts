import { describe, expect, it } from 'vitest'
import { groupTracksByAlbum, UNKNOWN_ALBUM_ID } from './groupTracksByAlbum.ts'
import type { Track } from './ranking/types.ts'

describe('groupTracksByAlbum', () => {
  it('groups tracks by album id', () => {
    const tracks: Track[] = [
      { id: '1', name: 'A', artist: 'X', albumId: 'alb1', albumName: 'Beta' },
      { id: '2', name: 'B', artist: 'X', albumId: 'alb2', albumName: 'Alpha' },
      { id: '3', name: 'C', artist: 'X', albumId: 'alb1', albumName: 'Beta' },
    ]
    const groups = groupTracksByAlbum(tracks)
    expect(groups).toHaveLength(2)
    expect(groups[0]?.albumName).toBe('Alpha')
    expect(groups[0]?.tracks).toHaveLength(1)
    expect(groups[1]?.tracks).toHaveLength(2)
  })

  it('puts tracks without album in unknown group', () => {
    const groups = groupTracksByAlbum([{ id: '1', name: 'A', artist: 'X' }])
    expect(groups[0]?.albumId).toBe(UNKNOWN_ALBUM_ID)
  })
})
