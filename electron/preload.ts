import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('desktopEnv', {
  isElectron: true,
})
