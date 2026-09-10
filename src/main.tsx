import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startCallForeground, stopCallForeground, setScreenKeepAwake } from './utils/native'
import { useCallSessionStore } from './utils/callSession'

// A fresh JS context can never own a call, so any call service still running is orphaned
// (webview reload, activity recreation). Clear it before the app renders.
stopCallForeground()

// The call outlives MeetingRoom — the floating call bar keeps it alive after the page
// unmounts — so the session store owns the foreground service, not any component.
let nativeCallState = 'off'
useCallSessionStore.subscribe((state) => {
  const stream = state.activeStream
  const next = !state.session
    ? 'off'
    : stream && stream.getVideoTracks().length > 0 ? 'video' : 'audio'
  if (next === nativeCallState) return
  nativeCallState = next

  if (next === 'off') {
    stopCallForeground()
    setScreenKeepAwake(false)
  } else {
    // Claim the camera service type only once a video track actually exists.
    startCallForeground(next === 'video')
    setScreenKeepAwake(true)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
