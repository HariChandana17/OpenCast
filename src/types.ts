export interface Attachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  attachments: Attachment[];
  timestamp: string;
  isPinned?: boolean;
  reactions?: Record<string, string[]>; // emoji -> array of senderIds
}

export interface Watcher {
  senderId: string;
  senderName: string;
  senderColor: string;
}

export interface UserProfile {
  id: string;
  name: string;
  color: string;
}
