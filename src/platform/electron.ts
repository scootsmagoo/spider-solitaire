import { browserStorage, type GameStorage } from './browser'

declare global {
  interface Window {
    desktopEnv?: {
      isElectron: boolean
    }
  }
}

export function isElectronRuntime(): boolean {
  return window.desktopEnv?.isElectron ?? false
}

export function getStorage(): GameStorage {
  return browserStorage
}
