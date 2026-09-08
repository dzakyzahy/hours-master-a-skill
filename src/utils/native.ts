import { Capacitor } from '@capacitor/core';
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
