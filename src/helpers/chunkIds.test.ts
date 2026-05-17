import { describe, expect, it } from 'vitest'
import { chunkIds, SPOTIFY_ID_BATCH_SIZE } from './chunkIds.ts'

describe('chunkIds', () => {
  it('uses batch size 50 by default', () => {
    const ids = Array.from({ length: 120 }, (_, i) => `id-${i}`)
    const chunks = chunkIds(ids)
    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toHaveLength(SPOTIFY_ID_BATCH_SIZE)
    expect(chunks[1]).toHaveLength(SPOTIFY_ID_BATCH_SIZE)
    expect(chunks[2]).toHaveLength(20)
  })

  it('returns empty array for empty input', () => {
    expect(chunkIds([])).toEqual([])
  })

  it('returns single chunk when under limit', () => {
    expect(chunkIds(['a', 'b'])).toEqual([['a', 'b']])
  })

  it('throws for invalid chunk size', () => {
    expect(() => chunkIds(['a'], 0)).toThrow()
  })
})
