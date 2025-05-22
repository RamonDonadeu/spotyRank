import useSpotifyLogin from "../hooks/useSpotifyLogin"
import "../css/Pages/HomePage.css"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

function HomePage() {

    const { login } = useSpotifyLogin()
    const navigate = useNavigate()
    const [access_token, setAccessToken] = useState<string | null>('')

    useEffect(() => {
        setAccessToken(() => localStorage.getItem('access_token'))
    }, [])

    return (
        <div className="homePage">
            <h1>SpotyRank</h1>
            <h2>Rank your favourite albums or lists</h2>
            <div>
            {
                access_token ?
                (<button onClick={()=>{navigate('/rank')}}>
                    Start Ranking
                </button>) :
                (<button onClick={() => login()}>
                    Login with Spotify
                </button>)
            }
            </div>
           
        </div>
    )
}

export default HomePage