import { describe, expect, test } from 'bun:test'
import { SETTINGS_DEFAULTS, changedSettings, humanizeSettingKey } from './settings-defaults'
import type { SettingsSnapshot } from '@/states/settings'

const defaults = () => ({ ...SETTINGS_DEFAULTS }) as SettingsSnapshot

describe('changedSettings', () => {
  test('a fresh install has changed nothing', () => {
    expect(changedSettings(defaults())).toEqual([])
  })

  test('reports only the keys that moved', () => {
    const current = { ...defaults(), hideShorts: false, playbackRate: 1.5 }
    expect(changedSettings(current).sort()).toEqual(['hideShorts', 'playbackRate'])
  })

  test('false and 0 are values, not "unset"', () => {
    const current = { ...defaults(), feedsEnabled: false, defaultZoom: 0 }
    expect(changedSettings(current).sort()).toEqual(['defaultZoom', 'feedsEnabled'])
  })
})

describe('humanizeSettingKey', () => {
  test('splits camelCase into words', () => {
    expect(humanizeSettingKey('autoHideHeader')).toBe('Auto hide header')
    expect(humanizeSettingKey('yt')).toBe('Yt')
  })
})
