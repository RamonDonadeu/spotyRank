import { Route, Routes } from "react-router";
import LoginResponsePage from "./pages/LoginResponsePage";
import HomePage from "./pages/HomePage";
import RankPage from "./pages/RankPage";
import { useEffect } from "react";
import useSpotifyLogin from "./hooks/useSpotifyLogin";
import './css/global.css'

function App() {

  const {refreshAccessToken} = useSpotifyLogin()

  useEffect(() => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      refreshAccessToken()
    }
    else {
      localStorage.clear()
    }
  })

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/loginResponse" element={<LoginResponsePage />} />
        <Route path="/rank" element={<RankPage/>}></Route>
      </Routes>
    </div>
  )
}

export default App
