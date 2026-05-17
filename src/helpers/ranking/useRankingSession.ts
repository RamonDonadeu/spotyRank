import { useCallback, useMemo, useState } from 'react'
import { getTrackAlbumKey } from '../groupTracksByAlbum.ts'
import { shuffle } from '../shuffle'
import {
  estimateRemainingSecondsRange,
  estimateTotalSecondsRange,
} from './rankingTimeEstimate'
import {
  applySegmentChoiceFromQuestion,
  getNextSegmentQuestion,
} from './segmentPlacement'
import {
  hasDuplicateIds,
  initialPlacementRange,
  insertAt,
  isPlacementComplete,
  resolvedInsertionIndex,
} from './placement'
import type { RankingState, SegmentPlacementQuestion, Track } from './types'

const LARGE_LIST_THRESHOLD = 25

export function useRankingSession(initialTracks: Track[] = []) {
  const [selected, setSelected] = useState<Track[]>([])
  const [pool, setPool] = useState<Track[]>([])
  const [sorted, setSorted] = useState<Track[]>([])
  const [currentCandidate, setCurrentCandidate] = useState<Track | null>(null)
  const [placementRange, setPlacementRange] = useState<{
    low: number
    high: number
  } | null>(null)
  const [placementRound, setPlacementRound] = useState(0)
  const [placementHistory, setPlacementHistory] = useState<Track[]>([])
  const [phase, setPhase] = useState<RankingState['phase']>('select')

  const placementQuestion: SegmentPlacementQuestion | null = useMemo(() => {
    if (!currentCandidate || !placementRange || isPlacementComplete(placementRange)) {
      return null
    }
    return getNextSegmentQuestion(
      sorted,
      currentCandidate,
      placementRange,
      placementRound,
    )
  }, [currentCandidate, placementRange, placementRound, sorted])

  const showLargeListWarning = selected.length > LARGE_LIST_THRESHOLD

  const estimatedTotalTime = useMemo(
    () => estimateTotalSecondsRange(selected.length),
    [selected.length],
  )

  const estimatedRemainingTime = useMemo(() => {
    if (phase !== 'ranking') {
      return { minSeconds: 0, maxSeconds: 0 }
    }
    return estimateRemainingSecondsRange({
      sortedLength: sorted.length,
      placementRange,
      poolLength: pool.length,
      hasCurrentCandidate: currentCandidate !== null,
    })
  }, [
    phase,
    sorted.length,
    placementRange,
    pool.length,
    currentCandidate,
  ])

  const toggleSelect = useCallback((track: Track) => {
    setSelected((prev) => {
      if (prev.some((t) => t.id === track.id)) {
        return prev.filter((t) => t.id !== track.id)
      }
      return [...prev, track]
    })
  }, [])

  const addTracks = useCallback((tracks: Track[]) => {
    if (tracks.length === 0) return
    setSelected((prev) => {
      const existing = new Set(prev.map((t) => t.id))
      const merged = [...prev]
      for (const track of tracks) {
        if (!existing.has(track.id)) {
          existing.add(track.id)
          merged.push(track)
        }
      }
      return merged
    })
  }, [])

  const removeTrack = useCallback((trackId: string) => {
    setSelected((prev) => prev.filter((t) => t.id !== trackId))
  }, [])

  const removeAlbum = useCallback((albumId: string) => {
    setSelected((prev) => prev.filter((t) => getTrackAlbumKey(t) !== albumId))
  }, [])

  const startNextCandidate = useCallback(
    (currentSorted: Track[], remainingPool: Track[]) => {
      if (remainingPool.length === 0) {
        setSorted(currentSorted)
        setCurrentCandidate(null)
        setPlacementRange(null)
        setPlacementRound(0)
        setPool([])
        setPhase('done')
        return
      }
      const [next, ...rest] = remainingPool
      setSorted(currentSorted)
      setPool(rest)
      setCurrentCandidate(next)
      setPlacementRange(initialPlacementRange(currentSorted.length))
      setPlacementRound(1)
    },
    [],
  )

  const beginRanking = useCallback(() => {
    if (selected.length === 0 || hasDuplicateIds(selected)) return
    const shuffled = shuffle(selected)
    const [first, ...rest] = shuffled
    setPlacementHistory([])
    setPhase('ranking')
    setSorted([first])
    if (rest.length === 0) {
      setPhase('done')
      setPool([])
      setCurrentCandidate(null)
      setPlacementRange(null)
      return
    }
    startNextCandidate([first], rest)
  }, [selected, startNextCandidate])

  const answerPlacement = useCallback(
    (bucketIndex: number) => {
      if (!currentCandidate || !placementRange || !placementQuestion) return
      const nextRange = applySegmentChoiceFromQuestion(placementQuestion, bucketIndex)
      if (!isPlacementComplete(nextRange)) {
        setPlacementRange(nextRange)
        setPlacementRound((r) => r + 1)
        return
      }
      const placedTrack = currentCandidate
      const index = resolvedInsertionIndex(nextRange)
      const newSorted = insertAt(sorted, placedTrack, index)
      setPlacementHistory((history) => [...history, placedTrack])
      startNextCandidate(newSorted, pool)
    },
    [currentCandidate, placementQuestion, placementRange, pool, sorted, startNextCandidate],
  )

  const discardCurrentCandidate = useCallback(() => {
    if (!currentCandidate || phase !== 'ranking') return
    startNextCandidate(sorted, pool)
  }, [currentCandidate, phase, sorted, pool, startNextCandidate])

  const canUndo = useMemo(
    () => (phase === 'ranking' || phase === 'done') && placementHistory.length > 0,
    [phase, placementHistory.length],
  )

  const undoLastPlacement = useCallback(() => {
    if (placementHistory.length === 0) return
    if (phase !== 'ranking' && phase !== 'done') return

    const lastPlaced = placementHistory[placementHistory.length - 1]!
    const newHistory = placementHistory.slice(0, -1)
    const newSorted = sorted.filter((track) => track.id !== lastPlaced.id)
    const newPool = currentCandidate ? [currentCandidate, ...pool] : pool

    setPlacementHistory(newHistory)
    setSorted(newSorted)
    setPool(newPool)
    setCurrentCandidate(lastPlaced)
    setPlacementRange(initialPlacementRange(newSorted.length))
    setPlacementRound(1)
    setPhase('ranking')
  }, [currentCandidate, phase, placementHistory, pool, sorted])

  const reset = useCallback(() => {
    setSelected([])
    setPool([])
    setSorted([])
    setCurrentCandidate(null)
    setPlacementRange(null)
    setPlacementRound(0)
    setPlacementHistory([])
    setPhase('select')
  }, [])

  return {
    availableTracks: initialTracks,
    selected,
    sorted,
    pool,
    currentCandidate,
    placementQuestion,
    placementRound,
    phase,
    showLargeListWarning,
    largeListThreshold: LARGE_LIST_THRESHOLD,
    estimatedTotalTime,
    estimatedRemainingTime,
    toggleSelect,
    addTracks,
    removeTrack,
    removeAlbum,
    beginRanking,
    answerPlacement,
    discardCurrentCandidate,
    canUndo,
    undoLastPlacement,
    reset,
  }
}
