package com.hoursmaster.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;
import androidx.lifecycle.Lifecycle;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Thin bridge to CallService. Start only while the app is foregrounded and capture is already granted. */
@CapacitorPlugin(name = "CallService")
public class CallPlugin extends Plugin {
    public static boolean isCallActive = false;
    public static boolean isPipEnabled = false;
    private static CallPlugin instance;

    public static boolean isPipAllowed() {
        return isCallActive && isPipEnabled;
    }

    @Override
    public void load() {
        super.load();
        instance = this;
        isCallActive = false;
        isPipEnabled = false;
    }

    public static void notifyPipMode(boolean isInPiP) {
        if (instance != null) {
            com.getcapacitor.JSObject data = new com.getcapacitor.JSObject();
            data.put("isInPiP", isInPiP);
            instance.notifyListeners("pipModeChanged", data);
        }
    }

    @PluginMethod
    public void setPipMode(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        isPipEnabled = enabled;
        if (getActivity() instanceof MainActivity) {
            ((MainActivity) getActivity()).updatePipAutoEnter(isPipAllowed());
        }
        call.resolve();
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getActivity() == null || !getActivity().getLifecycle().getCurrentState().isAtLeast(Lifecycle.State.RESUMED)) {
            call.reject("Call service can only start while the app is active");
            return;
        }

        boolean withVideo = Boolean.TRUE.equals(call.getBoolean("video", false));
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Microphone permission is not granted");
            return;
        }
        if (withVideo && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Camera permission is not granted");
            return;
        }

        Intent intent = new Intent(getContext(), CallService.class);
        intent.putExtra(CallService.EXTRA_VIDEO, withVideo);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            isCallActive = true;
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).updatePipAutoEnter(isPipAllowed());
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start call service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            getContext().stopService(new Intent(getContext(), CallService.class));
            isCallActive = false;
            isPipEnabled = false;
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).updatePipAutoEnter(false);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop call service: " + e.getMessage(), e);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (isCallActive) {
            try {
                getContext().stopService(new Intent(getContext(), CallService.class));
            } catch (Exception ignored) {}
            isCallActive = false;
            isPipEnabled = false;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void enterPiP(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getActivity().runOnUiThread(() -> {
                try {
                    android.util.Rational aspectRatio = new android.util.Rational(9, 16);
                    android.app.PictureInPictureParams.Builder builder = new android.app.PictureInPictureParams.Builder()
                            .setAspectRatio(aspectRatio);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        builder.setAutoEnterEnabled(true);
                    }
                    isPipEnabled = true;
                    boolean entered = getActivity().enterPictureInPictureMode(builder.build());
                    if (entered) {
                        call.resolve();
                    } else {
                        call.reject("Activity failed to enter PiP mode");
                    }
                } catch (Exception e) {
                    call.reject("Failed to enter PiP: " + e.getMessage(), e);
                }
            });
        } else {
            call.reject("PiP not supported on this Android version");
        }
    }
}
