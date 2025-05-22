import { useEffect } from "react"
import useSpotifyLogin from "../hooks/useSpotifyLogin"
import { useNavigate } from "react-router-dom"

function LoginResponsePage() {

    const { getResponse } = useSpotifyLogin()
    const navigate = useNavigate()

    useEffect(() => {
        getResponse().catch((error) => {
            console.error(error)
        }).finally(() => {
            navigate('/')
        })
    })
    
    return <div>Login Complete</div>
}

export default LoginResponsePage