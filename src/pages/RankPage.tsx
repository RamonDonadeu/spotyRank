import { createContext, useState } from "react"
import RankHeader from "../components/RankHeader"
import SpotifySearch from "../components/SpotifySearch"
import styleCss from '../css/pages/RankPage.module.css'
import { Item } from "../services/apiTypes"
import ConfirmSelection from "../components/ConfirmSelection"
import RankSongs from "../components/RankSongs"

export const AlbumsContext = createContext<
    {
        selectedAlbums: Item[],
        toggleSelectedAlbums: (album: Item) => void
    }>
    ({
        selectedAlbums: [],
        toggleSelectedAlbums: () => { }
    })

function RankLayout() {

    const [selectedAlbums, setSelectedAlbums] = useState<Item[]>([])
    const [step, setStep] = useState<number>(0)

    function toggleSelectedAlbums(album: Item) {
        setSelectedAlbums((current) => [...current, album])
    }
    
    function renderStep() {
        switch (step) {
            case 0:
                return <SpotifySearch></SpotifySearch>
            case 1:
                return <ConfirmSelection/>
            case 2:
                return <RankSongs/>
        }
    }

    function nextStep() {
        if(step === 2) return
        setStep((c) => c+1)
    }

    function prevStep() {
        if(step === 0) return
        setStep((c)=>c-1)   
    }
    
    return (
        <div className={styleCss.rankLayout + ' column'}>
            <RankHeader></RankHeader>
            <div className={styleCss.rankLayout_body}>
                <AlbumsContext value={{ selectedAlbums, toggleSelectedAlbums: toggleSelectedAlbums }}>
                    {renderStep()}
                    <div className={styleCss.rankLayout_buttons}>
                        <button onClick={prevStep}>Back</button>
                        <button onClick={nextStep}>Next</button>
                    </div>
                </AlbumsContext>
            </div>        
        </div>
    )
}

export default RankLayout