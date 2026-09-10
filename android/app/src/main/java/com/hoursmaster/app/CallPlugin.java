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
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start call service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            getContext().stopService(new Intent(getContext(), CallService.class));
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop call service: " + e.getMessage(), e);
        }
    }
}
