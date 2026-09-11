package com.hoursmaster.app;

import android.content.Intent;
import android.os.Build;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Thin bridge to CallService. Start only while the app is foregrounded and capture is already granted. */
@CapacitorPlugin(name = "CallService")
public class CallPlugin extends Plugin {
    public static boolean isCallActive = false;
    private static CallPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void notifyPipMode(boolean isInPiP) {
        if (instance != null) {
            com.getcapacitor.JSObject data = new com.getcapacitor.JSObject();
            data.put("isInPiP", isInPiP);
            instance.notifyListeners("pipModeChanged", data);
        }
    }

    @PluginMethod
    public void start(PluginCall call) {
        Intent intent = new Intent(getContext(), CallService.class);
        intent.putExtra(CallService.EXTRA_VIDEO, Boolean.TRUE.equals(call.getBoolean("video", false)));
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            isCallActive = true;
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
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop call service: " + e.getMessage(), e);
        }
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
