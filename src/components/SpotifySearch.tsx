import { ChangeEvent, useContext, useState, useRef } from "react"
import { spotifyApi } from "../services/spotifyApi"
import { AlbumsData } from "../services/apiTypes"
import AlbumResult from "./AlbumResult"
import { AlbumsContext } from "../pages/RankPage"

function SearchPlaylists() {
    const [albums, setAlbums] = useState<AlbumsData>()
    const {selectedAlbums, toggleSelectedAlbums} = useContext(AlbumsContext)
    const timeoutRef = useRef<number | undefined>(undefined)

    function search(event: ChangeEvent<HTMLInputElement>) {
        clearTimeout(timeoutRef.current)

        timeoutRef.current = setTimeout(()=>{
            spotifyApi.search({
                q: event.target.value,
                limit: 10,
                offset: 0,
                type: 'album'
            }).then((response) => {
                setAlbums(response.data.albums)
            })
        }, 300)
    }

    const availableAlbums = albums?.items.filter((item) => {
        return !selectedAlbums.some((album) => item.id === album.id)
    }) || []

    return <div>
        <input onChange={search}>
        </input>
        <div>
            {availableAlbums.map((album) => (
                <AlbumResult key={album.id} item={album} onClick={toggleSelectedAlbums} />
            ))}
        </div>
    </div>
}

export default SearchPlaylists