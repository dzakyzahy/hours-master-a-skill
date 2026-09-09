import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { exportChatToJSON } from './ChatDB';

export const initGoogleAuth = () => {
  GoogleAuth.initialize({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'],
    grantOfflineAccess: true,
  });
};

export const signInAndBackup = async () => {
  try {
    const user = await GoogleAuth.signIn();
    if (!user || !user.authentication) throw new Error("Google Login Failed");
    
    const accessToken = user.authentication.accessToken;
    
    // Export chat data & project data
    const chatData = await exportChatToJSON();
    let projectData = "{}";
    try {
      projectData = localStorage.getItem('hours-master-storage') || "{}";
    } catch (e) {}
    
    const combinedBackup = {
      chats: JSON.parse(chatData),
      projects: JSON.parse(projectData)
    };
    
    // Create backup file in Google Drive
    const metadata = {
      name: 'SkilloBackup.json',
      mimeType: 'application/json',
      parents: ['appDataFolder'] // App Data folder is better but requires different scope, we'll use root for now
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(combinedBackup)], { type: 'application/json' }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
      body: form,
    });
    
    if (!response.ok) throw new Error("Failed to upload to Google Drive");
    return true;
  } catch (error) {
    console.error("Backup Error:", error);
    return false;
  }
};
