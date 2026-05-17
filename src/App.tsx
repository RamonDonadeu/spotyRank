import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppHeader } from './components/AppHeader'
import { HomePage } from './pages/HomePage'
import { LoginResponsePage } from './pages/LoginResponsePage'
import { RankLayout } from './pages/RankLayout'
import { RankSelectPage } from './pages/RankSelectPage'
import { RankSortPage } from './pages/RankSortPage'
import { initAuthSession } from './services/spotifyAuth.ts'

function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const isRankViewport =
    pathname.startsWith('/rank/select') || pathname.startsWith('/rank/sort')

  return (
    <div className={`app-shell${isRankViewport ? ' app-shell--rank' : ''}`}>
      <AppHeader />
      <div className="app-shell__main">{children}</div>
    </div>
  )
}

export default function App() {
  useEffect(() => {
    initAuthSession()
  }, [])

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rank" element={<RankLayout />}>
            <Route index element={<Navigate to="select" replace />} />
            <Route path="select" element={<RankSelectPage />} />
            <Route path="sort" element={<RankSortPage />} />
          </Route>
          <Route path="/login" element={<LoginResponsePage />} />
          <Route path="/login/callback" element={<LoginResponsePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}
