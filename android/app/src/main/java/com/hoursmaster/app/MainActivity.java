package com.hoursmaster.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CallPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (CallPlugin.isCallActive) {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                try {
                    android.util.Rational aspectRatio = new android.util.Rational(9, 16);
                    android.app.PictureInPictureParams.Builder builder = new android.app.PictureInPictureParams.Builder()
                            .setAspectRatio(aspectRatio);
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                        builder.setAutoEnterEnabled(true);
                    }
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
