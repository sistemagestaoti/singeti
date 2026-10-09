export type Message = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  fileName?: string;
  fileSize?: string;
};

// Global store to hold chat messages in memory
const globalForChat = globalThis as unknown as {
  chatMessages: Message[];
  chatClients: Set<(message: Message) => void>;
};

export const chatMessages = globalForChat.chatMessages || [
  {
    id: "m1",
    senderId: "system",
    senderName: "Sistema",
    text: "Bem-vindo ao SINGETI Connect. Esta Ã© uma conversa segura.",
    timestamp: new Date().toISOString(),
  }
];

export const chatClients = globalForChat.chatClients || new Set();

if (process.env.NODE_ENV !== 'production') {
  globalForChat.chatMessages = chatMessages;
  globalForChat.chatClients = chatClients;
}

export function broadcastMessage(message: Message) {
  chatMessages.push(message);
  chatClients.forEach(client => client(message));
}

