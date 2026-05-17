import { createContext, useContext, type ReactNode } from 'react'
import { useRankingSession } from '../helpers/ranking/useRankingSession'
import type { Track } from '../helpers/ranking/types'

type RankingSessionValue = ReturnType<typeof useRankingSession>

const RankingSessionContext = createContext<RankingSessionValue | null>(null)

export function RankingSessionProvider({
  initialTracks,
  children,
}: {
  initialTracks: Track[]
  children: ReactNode
}) {
  const session = useRankingSession(initialTracks)
  return (
    <RankingSessionContext.Provider value={session}>{children}</RankingSessionContext.Provider>
  )
}

export function useRankingSessionContext(): RankingSessionValue {
  const value = useContext(RankingSessionContext)
  if (!value) {
    throw new Error('useRankingSessionContext must be used within RankingSessionProvider')
  }
  return value
}
