import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTaskSlice } from './slices/taskSlice'
import { createZoneSlice } from './slices/zoneSlice'
import { createSettingsSlice } from './slices/settingsSlice'
import { createHistorySlice } from './slices/historySlice'
import { createTimerSlice } from './slices/timerSlice'
import { DEFAULT_SETTINGS } from '@/types'

export const useAppStore = create()(
  persist(
    (...args) => ({
      ...createTaskSlice(...args),
      ...createZoneSlice(...args),
      ...createSettingsSlice(...args),
      ...createHistorySlice(...args),
      ...createTimerSlice(...args),
    }),
    {
      name: 'focus-flow-storage-v4',
      version: 4,
      storage: {
        getItem: async (name) => {
          try {
            const { getItem } = await import('./storage')
            return await getItem(name)
          } catch {
            return null
          }
        },
        setItem: async (name, value) => {
          try {
            const { setItem } = await import('./storage')
            await setItem(name, value)
          } catch {
            // ignore
          }
        },
        removeItem: async (name) => {
          try {
            const { removeItem } = await import('./storage')
            await removeItem(name)
          } catch {
            // ignore
          }
        },
      },
      merge: (persistedState, currentState) => {
        console.log('[MERGE] Hydrating persisted state')
        const persisted = persistedState as { settings?: Partial<Settings>; tasks?: Task[]; zones?: Zone[]; templates?: Template[]; history?: TaskHistoryEntry[] } | undefined
        if (!persisted || typeof persisted !== 'object') {
          console.log('[MERGE] No persisted state, using defaults')
          return currentState
        }
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...currentState.settings,
          ...persisted.settings,
        }
        // 用户没有手动设置过语言，根据系统语言自动设置
        const isLanguageManual = persisted.settings?.languageManual === true
        if (!isLanguageManual) {
          const systemLang = getSystemLanguage()
          mergedSettings.language = systemLang
          console.log('[MERGE] Auto-detected system language:', systemLang)
        } else {
          mergedSettings.language = persisted.settings?.language ?? mergedSettings.language
        }
        return {
          ...currentState,
          ...persisted,
          settings: mergedSettings,
          isHydrated: true,
        }
      },
    },
  ),
)
