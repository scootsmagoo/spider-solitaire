export interface GameStorage {
  get<T>(key: string, fallback: T): T
  set<T>(key: string, value: T): void
}

export const browserStorage: GameStorage = {
  get<T>(key: string, fallback: T): T {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },
  set<T>(key: string, value: T): void {
    window.localStorage.setItem(key, JSON.stringify(value))
  },
}
