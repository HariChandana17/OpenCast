import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = process.cwd();
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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
  reactions?: Record<string, string[]>; // emoji -> [senderIds]
}

// Memory cache + disk persistence for messages
let messagesStore: Message[] = [];

try {
  if (fs.existsSync(MESSAGES_FILE)) {
    const raw = fs.readFileSync(MESSAGES_FILE, 'utf-8');
    messagesStore = JSON.parse(raw);
  } else {
    // Add an initial welcome message so the stream is active
    messagesStore = [
      {
        id: 'msg_welcome_opencast',
        roomId: 'public',
        senderId: 'opencast_system',
        senderName: 'OpenCast Live',
        senderColor: '#3b82f6',
        text: '👋 Welcome to the public live stream! Anyone with this link can view updates in real-time, post with unlimited characters, share files, and delete messages. Copy the link above to invite others.',
        attachments: [],
        timestamp: new Date().toISOString(),
        isPinned: true,
        reactions: {
          '🚀': ['opencast_system'],
          '👋': ['opencast_system']
        }
      }
    ];
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messagesStore, null, 2), 'utf-8');
  }
} catch (err) {
  console.error('Error loading messages from disk:', err);
  messagesStore = [];
}

function saveMessagesToDisk() {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messagesStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save messages to disk:', err);
  }
}

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve static uploads
app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res, filePath) => {
    // Enable inline preview for images/audio/video/pdf
    const ext = path.extname(filePath).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.webm', '.mp3', '.wav', '.pdf', '.txt'].includes(ext)) {
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

// Setup Multer for file uploads (up to 50MB per file)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// REST API
app.get('/api/messages', (req, res) => {
  const room = (req.query.room as string) || 'public';
  const roomMessages = messagesStore.filter(m => m.roomId === room);
  res.json({ success: true, messages: roomMessages });
});

// Upload route
app.post('/api/upload', upload.array('files', 10), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }

    const attachments: Attachment[] = files.map(file => ({
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`
    }));

    res.json({ success: true, attachments });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message || 'File upload failed' });
  }
});

// Delete message route
app.delete('/api/messages/:id', (req, res) => {
  const { id } = req.params;
  const room = (req.query.room as string) || 'public';
  const index = messagesStore.findIndex(m => m.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Message not found' });
  }

  const deletedMsg = messagesStore[index];
  messagesStore.splice(index, 1);
  saveMessagesToDisk();

  // Broadcast deletion to all watchers in this room
  broadcastToRoom(room, {
    type: 'message:deleted',
    messageId: id,
    roomId: room
  });

  res.json({ success: true, deletedId: id });
});

// Clear room route
app.post('/api/rooms/:room/clear', (req, res) => {
  const { room } = req.params;
  messagesStore = messagesStore.filter(m => m.roomId !== room);
  saveMessagesToDisk();

  broadcastToRoom(room, {
    type: 'room:cleared',
    roomId: room
  });

  res.json({ success: true });
});

// HTTP Server & WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface ClientSession {
  ws: WebSocket;
  roomId: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  isAlive: boolean;
}

const clients = new Map<WebSocket, ClientSession>();

function getRoomWatchers(roomId: string) {
  const watchers: { senderId: string; senderName: string; senderColor: string }[] = [];
  const seen = new Set<string>();

  for (const session of clients.values()) {
    if (session.roomId === roomId && session.senderId && !seen.has(session.senderId)) {
      seen.add(session.senderId);
      watchers.push({
        senderId: session.senderId,
        senderName: session.senderName,
        senderColor: session.senderColor,
      });
    }
  }
  return watchers;
}

function broadcastPresence(roomId: string) {
  const watchers = getRoomWatchers(roomId);
  const payload = JSON.stringify({
    type: 'presence:update',
    roomId,
    count: watchers.length,
    watchers,
  });

  for (const [ws, session] of clients.entries()) {
    if (session.roomId === roomId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function broadcastToRoom(roomId: string, data: any, exceptWs?: WebSocket) {
  const payload = JSON.stringify(data);
  for (const [ws, session] of clients.entries()) {
    if (session.roomId === roomId && ws !== exceptWs && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// Heartbeat ping interval
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const session = clients.get(ws);
    if (!session || !session.isAlive) {
      ws.terminate();
      if (session) {
        clients.delete(ws);
        broadcastPresence(session.roomId);
      }
      return;
    }
    session.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const roomId = url.searchParams.get('room') || 'public';
  const senderId = url.searchParams.get('senderId') || `user_${Math.random().toString(36).substring(2, 9)}`;
  const senderName = url.searchParams.get('senderName') || 'Guest';
  const senderColor = url.searchParams.get('senderColor') || '#10b981';

  const session: ClientSession = {
    ws,
    roomId,
    senderId,
    senderName,
    senderColor,
    isAlive: true
  };
  clients.set(ws, session);

  ws.on('pong', () => {
    session.isAlive = true;
  });

  // Send initial room messages and presence immediately
  const initialMessages = messagesStore.filter(m => m.roomId === roomId);
  ws.send(JSON.stringify({
    type: 'room:init',
    roomId,
    messages: initialMessages,
    watchers: getRoomWatchers(roomId),
    count: getRoomWatchers(roomId).length
  }));

  // Update presence for everyone in room
  broadcastPresence(roomId);

  ws.on('message', (rawData) => {
    try {
      const data = JSON.parse(rawData.toString());

      if (data.type === 'user:join') {
        session.roomId = data.roomId || session.roomId;
        session.senderId = data.senderId || session.senderId;
        session.senderName = data.senderName || session.senderName;
        session.senderColor = data.senderColor || session.senderColor;
        broadcastPresence(session.roomId);
        return;
      }

      if (data.type === 'user:typing') {
        broadcastToRoom(session.roomId, {
          type: 'user:typing',
          roomId: session.roomId,
          senderId: session.senderId,
          senderName: session.senderName,
          isTyping: !!data.isTyping
        }, ws);
        return;
      }

      if (data.type === 'message:send') {
        const { text, attachments } = data;
        if ((!text || text.trim() === '') && (!attachments || attachments.length === 0)) {
          return;
        }

        const newMessage: Message = {
          id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          roomId: session.roomId,
          senderId: session.senderId,
          senderName: session.senderName,
          senderColor: session.senderColor,
          text: typeof text === 'string' ? text : '',
          attachments: Array.isArray(attachments) ? attachments : [],
          timestamp: new Date().toISOString(),
          reactions: {}
        };

        messagesStore.push(newMessage);
        saveMessagesToDisk();

        // Broadcast to ALL clients in the room including sender for instant sync
        broadcastToRoom(session.roomId, {
          type: 'message:new',
          roomId: session.roomId,
          message: newMessage
        });
        return;
      }

      if (data.type === 'message:delete') {
        const { messageId } = data;
        const index = messagesStore.findIndex(m => m.id === messageId);
        if (index !== -1) {
          messagesStore.splice(index, 1);
          saveMessagesToDisk();
          broadcastToRoom(session.roomId, {
            type: 'message:deleted',
            roomId: session.roomId,
            messageId
          });
        }
        return;
      }

      if (data.type === 'message:pin') {
        const { messageId } = data;
        const msg = messagesStore.find(m => m.id === messageId);
        if (msg) {
          msg.isPinned = !msg.isPinned;
          saveMessagesToDisk();
          broadcastToRoom(session.roomId, {
            type: 'message:updated',
            roomId: session.roomId,
            message: msg
          });
        }
        return;
      }

      if (data.type === 'message:react') {
        const { messageId, emoji } = data;
        const msg = messagesStore.find(m => m.id === messageId);
        if (msg && emoji) {
          if (!msg.reactions) msg.reactions = {};
          if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

          const existingIndex = msg.reactions[emoji].indexOf(session.senderId);
          if (existingIndex > -1) {
            msg.reactions[emoji].splice(existingIndex, 1);
            if (msg.reactions[emoji].length === 0) {
              delete msg.reactions[emoji];
            }
          } else {
            msg.reactions[emoji].push(session.senderId);
          }

          saveMessagesToDisk();
          broadcastToRoom(session.roomId, {
            type: 'message:updated',
            roomId: session.roomId,
            message: msg
          });
        }
        return;
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    const currentRoom = session.roomId;
    clients.delete(ws);
    broadcastPresence(currentRoom);
  });
});

// Vite middleware or static serving
async function setupVite() {
  if (process.env.NODE_ENV !== 'production' && !fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_DIR));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`OpenCast server running at http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
