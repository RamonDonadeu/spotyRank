import { useContext, useEffect, useState, useCallback } from "react"
import { AlbumsContext } from "../pages/RankPage"
import { Album, Track } from "../services/apiTypes"
import { spotifyApi } from "../services/spotifyApi"
import shuffle from "../helpers/shuffle"
import SpotifyTrack from "./SpotifyTrack"
import rankCSS from "../css/pages/RankPage.module.css"

function RankSongs() {

    const { selectedAlbums } = useContext(AlbumsContext)
    const [songs, setSongs] = useState<Track[]>([])
    const [loading, setLoading] = useState(false)
    const [sortedSongs, setSortedSongs] = useState<Track[]>([])
    const [loaded, setLoaded] = useState(false)

    const [frontIndex, setFrontIndex] = useState(0)
    const [backIndex, setBackIndex] = useState(0)
    const [middleIndex, setMiddleIndex] = useState(0)
    
    function sortedClass(index: number) {
        const edges = index === frontIndex || index === backIndex ? rankCSS.rankLayout_edges : ''
        const middle = index === middleIndex ? rankCSS.rankLayout_currentItemSorted : ''
        return (edges + ' ' + middle)
    }

    const calculateMiddleIndex = useCallback(()=>{
        return Math.floor((backIndex-frontIndex)/2)  + frontIndex
    }, [frontIndex, backIndex])
    
    useEffect(() => {
        setMiddleIndex(calculateMiddleIndex())
    }, [calculateMiddleIndex])
    
    const getAllSongs = useCallback(() => {
        setLoading(true)
        setSongs([])
        
        const promises = selectedAlbums.map((album: Album) => 
            spotifyApi.getSongsFromAlbum(album.id)
        )   
        
        Promise.all(promises)
            .then(responses => {
                const allSongs = responses.flatMap(response => response.data.items)
                setSortedSongs(()=>[allSongs.pop() as Track])
                shuffle(allSongs)
                setSongs(allSongs)
                setLoading(false)
                setLoaded(true)
                setBackIndex(0)
            })
            .catch(error => {
                console.error("Error fetching songs:", error)
                setLoading(false)
            })
    }, [selectedAlbums])

    useEffect(() => {       
        getAllSongs()
    }, [getAllSongs])

    // function isSortingFinished() {
    //     return frontIndex === backIndex
    // }

    function finishSorting(songIsBetter: boolean, position: number) {        
        switch (songIsBetter) {
            case true:
                insertSong(position)
                break
            case false:
                insertSong(position+1)
                break
        }
        setBackIndex(sortedSongs.length)
        setFrontIndex(0)
    }

    function insertSong(position: number) {
        if (position === 0) {
            setSortedSongs([songs[0], ...sortedSongs])
        }
        else if (position === sortedSongs.length) {
            setSortedSongs([...sortedSongs, songs[0]])
        }
        else {
            const front = [...sortedSongs.slice(0, position)]
            const back = [...sortedSongs.slice(position, sortedSongs.length)]
            setSortedSongs([...front, songs[0], ...back])
        }
        songs.shift()
        return        
    }

    function better() {
        const newBackIndex = Math.floor((backIndex-frontIndex)/2) + frontIndex
        setBackIndex(newBackIndex)
        if (frontIndex === newBackIndex ) {
            finishSorting(true, newBackIndex)
        }
    }

    function worst() {
        const newFrontIndex = Math.ceil((backIndex-frontIndex)/2) + frontIndex
        setFrontIndex(newFrontIndex)
        if (newFrontIndex === backIndex) {
            finishSorting(false, newFrontIndex)
        }
    }

    return (
        <div>
            <div>
                <div>
                    frontIndex {frontIndex}
                </div>
                <div>
                    backIndex {backIndex}
                </div>
                <div>
                    middle {middleIndex}
                </div>
            </div>
            <div>----------------</div>
            {loaded ? (
                <div className="row no-wrap">
                    <div className="cursor-pointer" onClick={better}>
                        <SpotifyTrack track={songs[0]}></SpotifyTrack>
                    </div>
                     <span> - </span>
                    <div className="cursor-pointer" onClick={worst}>
                        <SpotifyTrack track={sortedSongs[middleIndex]}></SpotifyTrack>
                    </div>
                </div>
            ) :
            <div>Loading</div>
            }           
            
            <div>----------------</div>
            <div>
                <div>order</div>
                <ul>
                    {sortedSongs.map((item, index) => 
                        <div id={item.id} className={sortedClass(index)}>
                            {item.name}
                        </div>
                    )}
                </ul>
            </div>
        </div>
    )
}

export default RankSongs