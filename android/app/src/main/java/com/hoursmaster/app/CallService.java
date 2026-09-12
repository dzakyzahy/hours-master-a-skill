package com.hoursmaster.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Keeps mic and camera alive while Skillo is backgrounded during a call, and routes
 * audio to the call stream. Without this, Android stops capture within seconds of
 * the user pressing Home (mandatory since API 34).
 */
public class CallService extends Service {

    public static final String EXTRA_VIDEO = "video";

    private static final String TAG = "SkilloCall";
    private static final String CHANNEL_ID = "skillo_call";
    private static final int NOTIFICATION_ID = 4711;

    private AudioManager audioManager;
    private int previousAudioMode = AudioManager.MODE_NORMAL;
    private boolean previousSpeakerOn = false;
    private boolean audioRouted = false;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        boolean withVideo = intent != null && intent.getBooleanExtra(EXTRA_VIDEO, false);

        try {
            createChannel();
            ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(), serviceType(withVideo));
            routeAudioToCall();
        } catch (RuntimeException e) {
            // Android 14+ rejects microphone/camera FGS starts when the activity is no
            // longer eligible. A rejected background enhancement must never kill the app.
            Log.e(TAG, "Foreground call service rejected", e);
            stopSelf(startId);
        }

        // A dropped call must not resurrect itself with a stale notification.
        return START_NOT_STICKY;
    }

    /** Swiped away from recents: the webview is gone, so the call is over. */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        stopSelf();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        restoreAudio();
        super.onDestroy();
    }

    /**
     * Declaring a type the app lacks permission for throws on API 34+, so the camera
     * type is only claimed when the call actually carries video.
     */
    private int serviceType(boolean withVideo) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return 0;
        int type = ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
        if (withVideo) type |= ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA;
        return type;
    }

    private Notification buildNotification() {
        Intent open = new Intent(this, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent tap = PendingIntent.getActivity(
                this, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Skillo")
                .setContentText("Panggilan sedang berlangsung")
                .setSmallIcon(android.R.drawable.ic_menu_call)
                .setContentIntent(tap)
                .setOngoing(true)
                .setShowWhen(true)
                .setUsesChronometer(true)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Panggilan", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Notifikasi selama panggilan berlangsung");
        channel.setShowBadge(false);
        channel.setSound(null, null);
        manager.createNotificationChannel(channel);
    }

    /** MODE_IN_COMMUNICATION enables the platform echo canceller; speaker is the sane default for video calls. */
    private void routeAudioToCall() {
        if (audioRouted) return;
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) return;

        try {
            previousAudioMode = audioManager.getMode();
            previousSpeakerOn = audioManager.isSpeakerphoneOn();
            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            // ponytail: setSpeakerphoneOn is deprecated on API 31+; swap for setCommunicationDevice
            // only when adding an earpiece/bluetooth picker, which needs UI anyway.
            audioManager.setSpeakerphoneOn(true);
            audioRouted = true;
        } catch (Exception e) {
            Log.w(TAG, "Audio routing failed", e);
        }
    }

    private void restoreAudio() {
        if (!audioRouted || audioManager == null) return;
        try {
            audioManager.setSpeakerphoneOn(previousSpeakerOn);
            audioManager.setMode(previousAudioMode);
        } catch (Exception e) {
            Log.w(TAG, "Audio restore failed", e);
        }
        audioRouted = false;
    }
}
