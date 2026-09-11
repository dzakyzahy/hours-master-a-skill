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
}

const CallService = registerPlugin<CallServicePlugin>('CallService');

/**
 * Android kills mic/camera a few seconds after the app is backgrounded unless a
 * foreground service holds them. Call only once capture permission is already granted —
 * claiming the camera service type without the permission throws on API 34+.
 */
export const startCallForeground = async (video: boolean) => {
  if (!isNative) return;
  try {
    await CallService.start({ video });
  } catch (err) {
    console.warn('[native] call foreground service failed to start:', err);
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
    await CallService.enterPiP();
  } catch (err) {
    console.warn('[native] failed to enter PiP:', err);
  }
};
