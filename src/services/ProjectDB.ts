import localforage from 'localforage';
import type { Project } from '../store';

/**
 * ProjectDB — Local Storage Service untuk Projects
 * 
 * Menggunakan IndexedDB via LocalForage.
 * Data disimpan PER USER (menggunakan userId sebagai namespace)
 * sehingga data antar user tidak pernah tercampur.
 * 
 * Strategi Storage (Tier 1 - GRATIS):
 *   Data project tersimpan di perangkat user secara offline-first.
 *   Untuk backup, user bisa gunakan Google Drive (BackupService).
 *   Untuk sync multi-perangkat, user butuh Skillo Cloud (berbayar).
 */

const DB_NAME = 'SkilloProjectsDB';
const DB_VERSION = 1;

function getProjectStore(userId: string) {
  return localforage.createInstance({
    name: DB_NAME,
    storeName: `projects_${userId}`,
    version: DB_VERSION,
    description: `Skillo projects for user ${userId}`,
    driver: [
      localforage.INDEXEDDB,
      localforage.WEBSQL,
      localforage.LOCALSTORAGE,
      'testMemoryDriver'
    ]
  });
}

// Simpan atau update satu project
export const saveProject = async (userId: string, project: Project): Promise<void> => {
  if (!userId) throw new Error('userId diperlukan untuk menyimpan project');
  const store = getProjectStore(userId);
  await store.setItem(project.id, project);
};

// Ambil semua project milik user (termasuk yang di recycle bin)
export const getProjects = async (userId: string): Promise<Project[]> => {
  if (!userId) return [];
  const store = getProjectStore(userId);
  const projects: Project[] = [];
  await store.iterate<Project, void>((value) => {
    projects.push(value);
  });
  return projects.sort((a, b) => b.lastUpdated - a.lastUpdated);
};

// Hapus satu project permanen dari storage lokal
export const removeProject = async (userId: string, projectId: string): Promise<void> => {
  if (!userId) return;
  const store = getProjectStore(userId);
  await store.removeItem(projectId);
};

// Simpan banyak project sekaligus (digunakan saat restore backup)
export const saveAllProjects = async (userId: string, projects: Project[]): Promise<void> => {
  if (!userId) return;
  const store = getProjectStore(userId);
  for (const project of projects) {
    await store.setItem(project.id, { ...project, userId });
  }
};

// Export semua project sebagai JSON string (untuk backup)
export const exportProjectsToJSON = async (userId: string): Promise<string> => {
  const projects = await getProjects(userId);
  return JSON.stringify(projects);
};

// Hapus SEMUA project user dari local storage (saat logout bersih)
export const clearUserProjects = async (userId: string): Promise<void> => {
  if (!userId) return;
  const store = getProjectStore(userId);
  await store.clear();
};

// Hapus data lama yang mungkin tersisa dari versi sebelumnya (migrasi)
export const cleanupLegacyDefaultProject = async (): Promise<void> => {
  // Project 'default-1' adalah project hardcoded lama yang menyebabkan bug 120 jam
  // Ini akan membersihkan dari zustand localStorage jika masih ada
  try {
    const keys = ['skillo-storage', 'hours-master-storage'];
    for (const key of keys) {
      const rawStorage = localStorage.getItem(key);
      if (!rawStorage) continue;
      const parsed = JSON.parse(rawStorage);
      const state = parsed?.state;
      if (state?.projects) {
        const cleanedProjects = state.projects.filter(
          (p: Project) => p.id !== 'default-1'
        );
        if (cleanedProjects.length !== state.projects.length) {
          parsed.state.projects = cleanedProjects;
          localStorage.setItem(key, JSON.stringify(parsed));
          console.info(`[ProjectDB] Legacy default project "Ethical Hacking" dihapus dari ${key}.`);
        }
      }
    }
  } catch {
    // Tidak masalah jika gagal — storage mungkin belum ada
  }
};
