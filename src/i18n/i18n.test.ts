import { describe, expect, it } from 'vitest'
import i18n from './index.ts'

describe('i18n', () => {
  it('loads English translations', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('home.startRanking')).toBe('Start ranking')
    expect(i18n.t('search.types.track')).toBe('Tracks')
    expect(i18n.t('rank.title')).toBe('Rank songs')
  })
})
