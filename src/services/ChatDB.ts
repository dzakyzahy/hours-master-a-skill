import localforage from 'localforage';

/**
 * ChatDB — Local Storage Service untuk Chat Messages
 * 
 * Menggunakan IndexedDB via LocalForage.
 * Data disimpan PER USER (userId sebagai namespace) agar
 * chat antar user tidak pernah tercampur.
 * 
 * Format key: `chats_{userId}_{friendId}`
 * Ini memastikan isolasi penuh per pasangan percakapan.
 */

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  synced: boolean;
  isRead?: boolean;
}

const DB_NAME = 'SkilloChatDB';

function getChatStore(userId: string) {
  return localforage.createInstance({
    name: DB_NAME,
    storeName: `chats_${userId}`,
    description: `Skillo chat messages for user ${userId}`,
    driver: [
      localforage.INDEXEDDB,
      localforage.WEBSQL,
      localforage.LOCALSTORAGE,
      'testMemoryDriver'
    ]
  });
}

// ================================================================
// Simpan pesan baru
// ================================================================
export const saveChatMessage = async (userId: string, msg: ChatMessage): Promise<void> => {
  if (!userId) throw new Error('userId diperlukan');
  const store = getChatStore(userId);
  const friendId = msg.senderId === userId ? msg.receiverId : msg.senderId;
  const key = `thread_${friendId}`;
  const existing = await store.getItem<ChatMessage[]>(key) || [];
  existing.push(msg);
  await store.setItem(key, existing);
};

// ================================================================
// Ambil riwayat chat dengan satu teman
// ================================================================
export const getChatHistory = async (userId: string, friendId: string): Promise<ChatMessage[]> => {
  if (!userId) return [];
  const store = getChatStore(userId);
  const key = `thread_${friendId}`;
  return await store.getItem<ChatMessage[]>(key) || [];
};

// ================================================================
// Hitung pesan yang belum dibaca
// ================================================================
export const getUnreadCount = async (userId: string, friendId: string): Promise<number> => {
  const messages = await getChatHistory(userId, friendId);
  return messages.filter(m => m.receiverId === userId && !m.isRead).length;
};

// ================================================================
// Tandai semua pesan dari teman tertentu sebagai sudah dibaca
// ================================================================
export const markAsRead = async (userId: string, friendId: string): Promise<void> => {
  if (!userId) return;
  const store = getChatStore(userId);
  const key = `thread_${friendId}`;
  const messages = await store.getItem<ChatMessage[]>(key) || [];
  const updated = messages.map(m =>
    m.receiverId === userId ? { ...m, isRead: true } : m
  );
  await store.setItem(key, updated);
};

// ================================================================
// Export SEMUA chat user sebagai JSON (untuk backup ke Drive)
// ================================================================
export const exportChatToJSON = async (userId: string): Promise<string> => {
  if (!userId) return '{}';
  const store = getChatStore(userId);
  const exportData: Record<string, ChatMessage[]> = {};
  await store.iterate<ChatMessage[], void>((value, key) => {
    exportData[key] = value;
  });
  return JSON.stringify(exportData);
};

// ================================================================
// Import chat dari JSON (digunakan saat restore dari Drive)
// ================================================================
export const importChatFromJSON = async (userId: string, jsonString: string): Promise<void> => {
  if (!userId) return;
  try {
    const store = getChatStore(userId);
    const data: Record<string, ChatMessage[]> = JSON.parse(jsonString);
    for (const [key, messages] of Object.entries(data)) {
      await store.setItem(key, messages);
    }
  } catch (error) {
    console.error('Failed to import chat data:', error);
  }
};

// ================================================================
// Hapus semua chat user (saat logout bersih)
// ================================================================
export const clearUserChats = async (userId: string): Promise<void> => {
  if (!userId) return;
  const store = getChatStore(userId);
  await store.clear();
};

// ================================================================
// LEGACY COMPAT — untuk kode lama yang belum dimigrasi
// Hapus setelah semua panggilan diupdate ke format baru
// ================================================================
/** @deprecated Gunakan saveChatMessage(userId, msg) */
export const saveChatMessageLegacy = async (msg: ChatMessage): Promise<void> => {
  const legacyDb = localforage.createInstance({ name: 'SkilloChatDB', storeName: 'chats' });
  const existing = await legacyDb.getItem<ChatMessage[]>(msg.receiverId) || [];
  existing.push(msg);
  await legacyDb.setItem(msg.receiverId, existing);
};

/** @deprecated Gunakan getChatHistory(userId, friendId) */
export const getChatHistoryLegacy = async (friendId: string): Promise<ChatMessage[]> => {
  const legacyDb = localforage.createInstance({ name: 'SkilloChatDB', storeName: 'chats' });
  return await legacyDb.getItem<ChatMessage[]>(friendId) || [];
};
