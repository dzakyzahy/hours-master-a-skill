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
                    android.app.PictureInPictureParams params = new android.app.PictureInPictureParams.Builder()
                            .setAspectRatio(aspectRatio)
                            .build();
                    enterPictureInPictureMode(params);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
