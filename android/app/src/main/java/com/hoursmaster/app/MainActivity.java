package com.hoursmaster.app;

import android.app.PictureInPictureParams;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CallPlugin.class);
        super.onCreate(savedInstanceState);
        updatePipAutoEnter(false);
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().resumeTimers();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        updatePipAutoEnter(CallPlugin.isPipAllowed());
    }

    public void updatePipAutoEnter(boolean enabled) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder()
                        .setAutoEnterEnabled(enabled);
                if (enabled) {
                    builder.setAspectRatio(new Rational(9, 16));
                }
                setPictureInPictureParams(builder.build());
            } catch (Exception ignored) {}
        }
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (CallPlugin.isPipAllowed()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    Rational aspectRatio = new Rational(9, 16);
                    PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder()
                            .setAspectRatio(aspectRatio);
                    enterPictureInPictureMode(builder.build());
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, android.content.res.Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        CallPlugin.notifyPipMode(isInPictureInPictureMode);
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().post(() -> {
                String js = "window.dispatchEvent(new CustomEvent('pipModeChanged', { detail: { isInPiP: " + isInPictureInPictureMode + " } }));" +
                            "if (" + isInPictureInPictureMode + ") { document.body.classList.add('pip-mode'); } else { document.body.classList.remove('pip-mode'); }";
                bridge.getWebView().evaluateJavascript(js, null);
            });
        }
    }
}
