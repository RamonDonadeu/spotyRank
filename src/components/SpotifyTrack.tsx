import { Track } from "../services/apiTypes";

interface Props {
    track: Track
}

function SpotifyTrack({track = {name}} : Props) {
    return <div>{track.name}</div>
    
}

export default SpotifyTrack