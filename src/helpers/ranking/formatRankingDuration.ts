import type { TFunction } from 'i18next'

/** Human-readable approximate duration for ranking time estimates. */
export function formatRankingDuration(seconds: number, t: TFunction): string {
  if (seconds <= 0) {
    return t('rank.durationZero')
  }

  if (seconds < 90) {
    const rounded = Math.max(5, Math.ceil(seconds / 5) * 5)
    return t('rank.durationSeconds', { count: rounded })
  }

  if (seconds < 3600) {
    const minutes = Math.max(1, Math.ceil(seconds / 60))
    return t('rank.durationMinutes', { count: minutes })
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.max(1, Math.ceil((seconds % 3600) / 60))
  return t('rank.durationHoursMinutes', { hours, minutes })
}

/** Approximate duration range (e.g. 5–10 min). */
export function formatRankingDurationRange(
  minSeconds: number,
  maxSeconds: number,
  t: TFunction,
): string {
  if (maxSeconds <= 0) {
    return t('rank.durationZero')
  }

  const minLabel = formatRankingDuration(Math.max(0, minSeconds), t)
  const maxLabel = formatRankingDuration(maxSeconds, t)

  if (minLabel === maxLabel) {
    return minLabel
  }

  return t('rank.durationRange', { min: minLabel, max: maxLabel })
}
