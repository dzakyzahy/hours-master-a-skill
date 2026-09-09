import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { exportChatToJSON } from './ChatDB';
import { exportProjectsToJSON } from './ProjectDB';

/**
 * BackupService — Google Drive Backup & Restore
 * 
 * Strategi backup seperti WhatsApp:
 * - Data tersimpan lokal di HP (Tier 1 — GRATIS via LocalForage)
 * - Backup manual/otomatis ke Google Drive (Tier 2 — GRATIS)
 * - Restore otomatis saat install ulang
 * 
 * File yang disimpan di Drive (folder: appDataFolder — private per app):
 * - SkilloChats_{userId}.json
 * - SkilloProjects_{userId}.json
 * 
 * Keamanan: menggunakan scope 'appDataFolder' sehingga file HANYA
 * bisa diakses oleh aplikasi Skillo, tidak terlihat di Google Drive UI user.
 */

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

export const initGoogleAuth = () => {
  if (!Capacitor.isNativePlatform()) return;
  GoogleAuth.initialize({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scopes: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/drive.appdata', // appDataFolder scope
    ],
    grantOfflineAccess: true,
  });
};

// ================================================================
// Login Google dan ambil access token
// ================================================================
const getGoogleAccessToken = async (): Promise<string> => {
  const user = await GoogleAuth.signIn();
  if (!user?.authentication?.accessToken) {
    throw new Error('Google Sign-In gagal atau akses ditolak');
  }
  return user.authentication.accessToken;
};

// ================================================================
// Cari file di appDataFolder berdasarkan nama
// ================================================================
const findFileInDrive = async (accessToken: string, filename: string): Promise<string | null> => {
  const query = `name='${filename}' and 'appDataFolder' in parents`;
  const url = `${DRIVE_API_URL}?spaces=appDataFolder&q=${encodeURIComponent(query)}&fields=files(id,name)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0]?.id || null;
};

// ================================================================
// Upload atau update file di appDataFolder
// ================================================================
const uploadToDrive = async (
  accessToken: string,
  filename: string,
  content: string,
  existingFileId?: string | null
): Promise<boolean> => {
  const metadata = {
    name: filename,
    mimeType: 'application/json',
    ...(existingFileId ? {} : { parents: ['appDataFolder'] }),
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: 'application/json' }));

  const url = existingFileId
    ? `${DRIVE_UPLOAD_URL}/${existingFileId}?uploadType=multipart`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart`;

  const method = existingFileId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  return res.ok;
};

// ================================================================
// Download file dari Drive
// ================================================================
const downloadFromDrive = async (accessToken: string, fileId: string): Promise<string | null> => {
  const res = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;
  return res.text();
};

// ================================================================
// BACKUP — Upload chat & project ke Google Drive
// ================================================================
export interface BackupResult {
  success: boolean;
  chatBacked: boolean;
  projectsBacked: boolean;
  error?: string;
  timestamp?: string;
}

export const signInAndBackup = async (userId: string): Promise<BackupResult> => {
  try {
    const accessToken = await getGoogleAccessToken();

    const chatFilename = `SkilloChats_${userId}.json`;
    const projectsFilename = `SkilloProjects_${userId}.json`;

    // Export data
    const chatData = await exportChatToJSON(userId);
    const projectData = await exportProjectsToJSON(userId);

    // Cek apakah file sudah ada di Drive (untuk update, bukan duplicate)
    const [existingChatId, existingProjectsId] = await Promise.all([
      findFileInDrive(accessToken, chatFilename),
      findFileInDrive(accessToken, projectsFilename),
    ]);

    // Upload keduanya
    const [chatBacked, projectsBacked] = await Promise.all([
      uploadToDrive(accessToken, chatFilename, chatData, existingChatId),
      uploadToDrive(accessToken, projectsFilename, projectData, existingProjectsId),
    ]);

    const timestamp = new Date().toISOString();
    if (chatBacked || projectsBacked) {
      localStorage.setItem('last_backup_timestamp', timestamp);
      localStorage.setItem('last_backup_user', userId);
    }

    return {
      success: chatBacked && projectsBacked,
      chatBacked,
      projectsBacked,
      timestamp,
    };
  } catch (error: any) {
    console.error('Backup Error:', error);
    return {
      success: false,
      chatBacked: false,
      projectsBacked: false,
      error: error.message || 'Backup gagal. Coba lagi.',
    };
  }
};

// ================================================================
// RESTORE — Download & import data dari Google Drive
// ================================================================
export interface RestoreResult {
  success: boolean;
  chatRestored: boolean;
  projectsRestored: boolean;
  error?: string;
}

export const restoreFromDrive = async (
  userId: string,
  onImportChats: (json: string) => Promise<void>,
  onImportProjects: (json: string) => Promise<void>
): Promise<RestoreResult> => {
  try {
    const accessToken = await getGoogleAccessToken();

    const chatFilename = `SkilloChats_${userId}.json`;
    const projectsFilename = `SkilloProjects_${userId}.json`;

    // Cari file di Drive
    const [chatFileId, projectsFileId] = await Promise.all([
      findFileInDrive(accessToken, chatFilename),
      findFileInDrive(accessToken, projectsFilename),
    ]);

    let chatRestored = false;
    let projectsRestored = false;

    // Restore chat
    if (chatFileId) {
      const chatJson = await downloadFromDrive(accessToken, chatFileId);
      if (chatJson) {
        await onImportChats(chatJson);
        chatRestored = true;
      }
    }

    // Restore projects
    if (projectsFileId) {
      const projectsJson = await downloadFromDrive(accessToken, projectsFileId);
      if (projectsJson) {
        await onImportProjects(projectsJson);
        projectsRestored = true;
      }
    }

    if (!chatFileId && !projectsFileId) {
      return {
        success: false,
        chatRestored: false,
        projectsRestored: false,
        error: 'Tidak ada backup ditemukan di Google Drive untuk akun ini.',
      };
    }

    return { success: true, chatRestored, projectsRestored };
  } catch (error: any) {
    console.error('Restore Error:', error);
    return {
      success: false,
      chatRestored: false,
      projectsRestored: false,
      error: error.message || 'Restore gagal. Pastikan Anda memberikan akses Google Drive.',
    };
  }
};

// ================================================================
// Cek apakah perlu auto-backup (lebih dari 24 jam sejak backup terakhir)
// ================================================================
export const shouldAutoBackup = (): boolean => {
  try {
    const lastBackup = localStorage.getItem('last_backup_timestamp');
    if (!lastBackup) return true;
    const elapsed = Date.now() - new Date(lastBackup).getTime();
    return elapsed > 24 * 60 * 60 * 1000; // 24 jam
  } catch {
    return false;
  }
};

export const getLastBackupInfo = () => {
  try {
    const timestamp = localStorage.getItem('last_backup_timestamp');
    const user = localStorage.getItem('last_backup_user');
    return { timestamp, user };
  } catch {
    return { timestamp: null, user: null };
  }
};
