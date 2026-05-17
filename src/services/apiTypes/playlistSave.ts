export type PlaylistSaveResult = {
  playlistId: string
  playlistName: string
  playlistUrl?: string
  savedCount: number
  totalCount: number
  partialFailure: boolean
}
