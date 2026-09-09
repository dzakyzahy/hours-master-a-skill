import localforage from 'localforage';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  synced: boolean;
}

const chatDb = localforage.createInstance({
  name: "SkilloChatDB",
  storeName: "chats"
});

export const saveChatMessage = async (msg: ChatMessage) => {
  const existing = await chatDb.getItem<ChatMessage[]>(msg.receiverId) || [];
  existing.push(msg);
  await chatDb.setItem(msg.receiverId, existing);
};

export const getChatHistory = async (friendId: string): Promise<ChatMessage[]> => {
  return await chatDb.getItem<ChatMessage[]>(friendId) || [];
};

export const exportChatToJSON = async () => {
  const keys = await chatDb.keys();
  const exportData: Record<string, ChatMessage[]> = {};
  for (const key of keys) {
    exportData[key] = await chatDb.getItem<ChatMessage[]>(key) || [];
  }
  return JSON.stringify(exportData);
};

export const importChatFromJSON = async (jsonString: string) => {
  try {
    const data = JSON.parse(jsonString);
    for (const key of Object.keys(data)) {
      await chatDb.setItem(key, data[key]);
    }
  } catch (error) {
    console.error("Failed to import chat data", error);
  }
};
