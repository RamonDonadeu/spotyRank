export interface SearchRequest {
    type: "album",
    q: string,
    limit: number,
    offset: number,
}

export interface SearchResponse {
    albums: AlbumsData
}

export interface AlbumsData {
    href: string
    limit: number
    next: string
    offset: number
    previous: any
    total: number
    items: Album[]
}

export interface Album {
    album_type: string
    total_tracks: number
    available_markets: string[]
    external_urls: ExternalUrls
    href: string
    id: string
    images: Image[]
    name: string
    release_date: string
    release_date_precision: string
    type: string
    uri: string
    artists: Artist[]
}

interface ExternalUrls {
    spotify: string
}

export interface Image {
    height: number
    url: string
    width: number
}

interface Artist {
    external_urls: ExternalUrls2
    href: string
    id: string
    name: string
    type: string
    uri: string
}

interface ExternalUrls2 {
    spotify: string
}
