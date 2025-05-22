import { useContext } from "react"
import { AlbumsContext } from "../pages/RankPage"

function ConfirmSelection() {

    const {selectedAlbums} = useContext(AlbumsContext)

    return (
        
        <div>
            <h3>Selected Albums: {selectedAlbums.length}</h3>
            {selectedAlbums.map(album => (
                <div key={album.id}>{album.name}</div>
            ))}
        </div>
  )
}

export default ConfirmSelection