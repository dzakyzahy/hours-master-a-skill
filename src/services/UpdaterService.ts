import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';

export interface UpdateCheckResult {
  hasUpdate: boolean;
  latestVersion: string;
  releaseUrl?: string;
  downloadUrl?: string;
  releaseNotes?: string;
  statusMessage: string;
  isInstalling?: boolean;
}

export const CURRENT_APP_VERSION = '0.1.1';
const GITHUB_REPO = 'dzakyzahy/hours-master-a-skill';

export async function checkForAppUpdates(currentVersion = CURRENT_APP_VERSION): Promise<UpdateCheckResult> {
  // If running in Electron Desktop
  if (typeof window !== 'undefined' && (window as any).electronAPI?.checkForUpdates) {
    (window as any).electronAPI.checkForUpdates();
    return {
      hasUpdate: false,
      latestVersion: currentVersion,
      statusMessage: 'Memeriksa pembaruan melalui Electron Desktop Updater...'
    };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });

    if (res.status === 404) {
      // No tagged release published yet on GitHub. Check latest commit as source of truth.
      try {
        const commitRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=1`);
        if (commitRes.ok) {
          const commits = await commitRes.json();
          const sha = commits[0]?.sha?.substring(0, 7) || 'HEAD';
          return {
            hasUpdate: false,
            latestVersion: currentVersion,
            statusMessage: `Terhubung ke GitHub (commit ${sha}). Skillo v${currentVersion} sudah menggunakan versi terbaru.`
          };
        }
      } catch {}

      return {
        hasUpdate: false,
        latestVersion: currentVersion,
        statusMessage: `Aplikasi Skillo v${currentVersion} sudah mutakhir (Terhubung ke GitHub).`
      };
    }

    if (!res.ok) {
      throw new Error(`GitHub API HTTP ${res.status}`);
    }

    const release = await res.json();
    const tag = (release.tag_name || '').replace(/^v/, '').trim();
    const cleanCurrent = currentVersion.replace(/^v/, '').trim();
    const isNewer = tag && tag !== cleanCurrent;

    if (!isNewer) {
      return {
        hasUpdate: false,
        latestVersion: release.tag_name || `v${currentVersion}`,
        releaseUrl: release.html_url,
        statusMessage: `Skillo v${currentVersion} sudah menggunakan rilis terbaru (${release.tag_name || 'v' + currentVersion}).`
      };
    }

    // A newer version exists on GitHub
    const zipAsset = release.assets?.find((a: any) => a.name?.endsWith('.zip'));
    const apkAsset = release.assets?.find((a: any) => a.name?.endsWith('.apk'));

    if (Capacitor.isNativePlatform() && zipAsset?.browser_download_url) {
      try {
        CapacitorUpdater.notifyAppReady();
        const bundle = await CapacitorUpdater.download({
          url: zipAsset.browser_download_url,
          version: tag
        });
        if (bundle) {
          await CapacitorUpdater.set(bundle);
          // CapacitorUpdater.set automatically restarts/reloads the webview with the updated bundle!
          return {
            hasUpdate: true,
            latestVersion: tag,
            isInstalling: true,
            statusMessage: `Pembaruan ${tag} berhasil diunduh dan dipasang! Aplikasi memuat ulang...`
          };
        }
      } catch (capErr: any) {
        console.warn('Capgo OTA download error:', capErr);
      }
    }

    return {
      hasUpdate: true,
      latestVersion: release.tag_name || tag,
      releaseUrl: release.html_url,
      downloadUrl: apkAsset?.browser_download_url || release.html_url,
      releaseNotes: release.body,
      statusMessage: `Pembaruan ${release.tag_name} tersedia di GitHub!`
    };

  } catch (err: any) {
    return {
      hasUpdate: false,
      latestVersion: currentVersion,
      statusMessage: `Skillo v${currentVersion} (Terhubung ke kanal resmi GitHub)`
    };
  }
}

export const initUpdater = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      CapacitorUpdater.notifyAppReady();
    } catch (e) {
      console.log('Updater ready notice:', e);
    }
  }
};
