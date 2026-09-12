/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { startCallForeground, stopCallForeground, setScreenKeepAwake, setCallPipEnabled } from './utils/native'
import { useCallSessionStore } from './utils/callSession'
import { getNativeCallMode, type NativeCallMode } from './utils/callLifecycle'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// A fresh JS context can never own a call, so any call service still running is orphaned
// (webview reload, activity recreation). Clear it before the app renders.
stopCallForeground()
setCallPipEnabled(false)

// The call outlives MeetingRoom — the floating call bar keeps it alive after the page
// unmounts — so the session store owns the foreground service, not any component.
let nativeCallState: NativeCallMode = 'off'
let appIsActive = true
let syncQueue = Promise.resolve()

function syncNativeCallService() {
  syncQueue = syncQueue.then(async () => {
    const state = useCallSessionStore.getState()
    const stream = state.activeStream
    const next = getNativeCallMode(
      Boolean(state.session),
      Boolean(stream),
      Boolean(stream?.getVideoTracks().length)
    )
    if (next === nativeCallState) return

    if (next === 'off') {
      await stopCallForeground()
      await setCallPipEnabled(false)
      await setScreenKeepAwake(false)
      nativeCallState = 'off'
    } else {
      if (!appIsActive) return
      const started = await startCallForeground(next === 'video')
      if (started) {
        nativeCallState = next
        await setScreenKeepAwake(true)
      }
    }
  }).catch(err => console.warn('[native] call service sync failed:', err))
}

useCallSessionStore.subscribe(syncNativeCallService)

if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    appIsActive = isActive
    if (isActive) syncNativeCallService()
  }).catch(() => {})
}

if ('serviceWorker' in navigator) {
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
