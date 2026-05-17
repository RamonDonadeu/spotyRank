/** Spotify Web API shapes used by search (subset of fields we read). */

export type SpotifyImage = {
  url: string
  height: number | null
  width: number | null
}

export type SpotifyArtistRef = {
  id: string
  name: string
}

export type SpotifyAlbumRef = {
  id: string
  name: string
  images: SpotifyImage[]
}

export type SpotifySearchTrack = {
  id: string
  name: string
  artists: SpotifyArtistRef[]
  album: SpotifyAlbumRef
}

export type SpotifySearchAlbum = {
  id: string
  name: string
  artists: SpotifyArtistRef[]
  images: SpotifyImage[]
}

export type SpotifySearchArtist = {
  id: string
  name: string
  images: SpotifyImage[]
}

export type SpotifySearchResponse = {
  tracks?: SpotifySearchTracksPage
  albums?: { items: SpotifySearchAlbum[] }
  artists?: { items: SpotifySearchArtist[] }
}

export type SpotifyAlbumTrack = {
  id: string
  name: string
  artists: SpotifyArtistRef[]
}

export type SpotifyAlbumTracksPage = {
  items: SpotifyAlbumTrack[]
  next: string | null
}

export type SpotifyTopTracksResponse = {
  tracks: SpotifySearchTrack[]
}

export type SpotifyArtistAlbumSummary = {
  id: string
  name: string
  images: SpotifyImage[]
}

export type SpotifyArtistAlbumsPage = {
  items: SpotifyArtistAlbumSummary[]
  next: string | null
  total: number
}

export type SpotifySearchTracksPage = {
  items: SpotifySearchTrack[]
  next: string | null
  total: number
}
