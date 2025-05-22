import { Album } from "../services/apiTypes"

interface AlbumResultProps {
  item: Album;
  onClick?: (item: Album) => void;
}

function AlbumResult({ item, onClick }: AlbumResultProps) {
    return (
        <div 
          className="row no-warp cursor-pointer"
          onClick={() => onClick && onClick(item)}
        >
            <img src={item.images[0].url} alt="" height={100} width={100} />
            <div className="column no-wrap">
                <span>{item.name}</span>
                <span>{item.artists[0].name}</span>
                <span>{item.total_tracks} songs</span>
            </div>
        </div>)    
}

export default AlbumResult