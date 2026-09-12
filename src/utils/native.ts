import { Capacitor, registerPlugin } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const isNative = Capacitor.isNativePlatform();

/**
 * Trigger subtle tactile haptic vibration on native mobile
 */
export const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
  if (!isNative) return;
  try {
    await Haptics.impact({ style });
  } catch {
    // Graceful degradation on unsupported platforms
  }
};

/**
 * Trigger success notification haptic vibration
 */
export const triggerSuccessHaptic = async () => {
  if (!isNative) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Graceful degradation
  }
};

/**
 * Control whether device screen stays on (e.g. during focus timer)
 */
export const setScreenKeepAwake = async (keepAwake: boolean) => {
  if (!isNative) return;
  try {
    if (keepAwake) {
      await KeepAwake.keepAwake();
    } else {
      await KeepAwake.allowSleep();
    }
  } catch {
    // Graceful degradation
  }
};

interface CallServicePlugin {
  start(options: { video: boolean }): Promise<void>;
  stop(): Promise<void>;
  enterPiP(): Promise<void>;
  setPipMode(options: { enabled: boolean }): Promise<void>;
  addListener(
    eventName: 'pipModeChanged',
    listenerFunc: (data: { isInPiP: boolean }) => void
  ): Promise<any>;
}

const CallService = registerPlugin<CallServicePlugin>('CallService');

export const setCallPipEnabled = async (enabled: boolean) => {
  if (!isNative) return;
  try {
    await CallService.setPipMode({ enabled });
  } catch (err) {
    console.warn('[native] failed to set PiP mode:', err);
  }
};

/**
 * Android kills mic/camera a few seconds after the app is backgrounded unless a
 * foreground service holds them. Call only once capture permission is already granted —
 * claiming the camera service type without the permission throws on API 34+.
 */
export const startCallForeground = async (video: boolean): Promise<boolean> => {
  if (!isNative) return false;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return false;
  try {
    await CallService.start({ video });
    return true;
  } catch (err) {
    console.warn('[native] call foreground service failed to start:', err);
    return false;
  }
};

export const stopCallForeground = async () => {
  if (!isNative) return;
  try {
    await CallService.stop();
  } catch (err) {
    console.warn('[native] call foreground service failed to stop:', err);
  }
};

/** Android WebView has no getDisplayMedia; screen share there needs a MediaProjection plugin. */
export const canScreenShare =
  !isNative && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;

export const enterCallPiP = async () => {
  if (!isNative) return;
  try {
    document.body.classList.add('pip-mode');
    await CallService.enterPiP();
  } catch (err) {
    document.body.classList.remove('pip-mode');
    console.warn('[native] failed to enter PiP:', err);
  }
};

/**
 * Listen to PiP enter/exit events from Android OS lifecycle
 */
export const addPiPListener = (callback: (isInPiP: boolean) => void) => {
  const windowHandler = (e: any) => {
    callback(!!e.detail?.isInPiP);
  };
  window.addEventListener('pipModeChanged', windowHandler);

  let pluginListener: any = null;
  if (isNative) {
    try {
      pluginListener = CallService.addListener('pipModeChanged', (data: { isInPiP: boolean }) => {
        callback(!!data.isInPiP);
      });
    } catch {}
  }

  return () => {
    window.removeEventListener('pipModeChanged', windowHandler);
    pluginListener?.then?.((l: any) => l.remove?.()).catch?.(() => {});
  };
};
