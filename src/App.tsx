/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Radio, 
  Share2, 
  Users, 
  ArrowDown, 
  Sparkles, 
  Pin, 
  Download, 
  Trash2, 
  AlertCircle,
  FileText,
  MessageSquare,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import { Message, Attachment, Watcher, UserProfile } from './types';
import { 
  getOrCreateUserProfile, 
  saveUserProfile, 
  playChimeSound, 
  formatDate 
} from './utils/helpers';
import { Navbar } from './components/Navbar';
import { MessageItem } from './components/MessageItem';
import { MessageComposer } from './components/MessageComposer';
import { LightboxModal } from './components/LightboxModal';
import { ShareModal } from './components/ShareModal';
import { ProfileModal } from './components/ProfileModal';
import { WatchersModal } from './components/WatchersModal';

export default function App() {
  // Room identifier from URL (?room=...)
  const [room, setRoom] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'public';
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(getOrCreateUserProfile);
  const [messages, setMessages] = useState<Message[]>([]);
  const [watchers, setWatchers] = useState<Watcher[]>([]);
  const [watchersCount, setWatchersCount] = useState<number>(1);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map()); // id -> name

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFilesOnly, setFilterFilesOnly] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Modals
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isWatchersModalOpen, setIsWatchersModalOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);

  // Update URL search param when room changes without reloading
  const handleSelectRoom = (newRoom: string) => {
    setRoom(newRoom);
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoom);
    window.history.pushState({}, '', url.toString());
  };

  // Scroll to bottom smoothly
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Track scroll position to conditionally show "Scroll to bottom" button
  const handleScroll = () => {
    if (!streamContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = streamContainerRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const isNearBottom = distanceFromBottom < 120;
    isNearBottomRef.current = isNearBottom;
    setShowScrollBottom(!isNearBottom);
  };

  // Connect WebSocket & fetch initial messages
  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout: any = null;

    // First fetch REST messages
    fetch(`/api/messages?room=${encodeURIComponent(room)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.messages)) {
          setMessages(data.messages);
          setTimeout(() => scrollToBottom('auto'), 50);
        }
      })
      .catch((err) => console.error('Error fetching messages:', err));

    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?room=${encodeURIComponent(
        room
      )}&senderId=${encodeURIComponent(currentUser.id)}&senderName=${encodeURIComponent(
        currentUser.name
      )}&senderColor=${encodeURIComponent(currentUser.color)}`;

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'room:init') {
            setMessages(payload.messages || []);
            setWatchers(payload.watchers || []);
            setWatchersCount(payload.count || 1);
            setTimeout(() => scrollToBottom('auto'), 100);
            return;
          }

          if (payload.type === 'presence:update') {
            setWatchers(payload.watchers || []);
            setWatchersCount(payload.count || 1);
            return;
          }

          if (payload.type === 'message:new') {
            const newMsg: Message = payload.message;
            setMessages((prev) => {
              // Avoid duplicate insertion
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Chime if not from current user
            if (newMsg.senderId !== currentUser.id && soundEnabled) {
              playChimeSound();
            }

            // If user is already near bottom, auto-scroll down
            if (isNearBottomRef.current) {
              setTimeout(() => scrollToBottom('smooth'), 50);
            }
            return;
          }

          if (payload.type === 'message:deleted') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
            return;
          }

          if (payload.type === 'message:updated') {
            const updatedMsg: Message = payload.message;
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            );
            return;
          }

          if (payload.type === 'room:cleared') {
            setMessages([]);
            return;
          }

          if (payload.type === 'user:typing') {
            if (payload.senderId !== currentUser.id) {
              setTypingUsers((prev) => {
                const next = new Map(prev);
                if (payload.isTyping) {
                  next.set(payload.senderId, payload.senderName);
                } else {
                  next.delete(payload.senderId);
                }
                return next;
              });

              // Auto-clear typing indicator after 2.5s if no stop received
              if (payload.isTyping) {
                setTimeout(() => {
                  setTypingUsers((prev) => {
                    const next = new Map(prev);
                    next.delete(payload.senderId);
                    return next;
                  });
                }, 2500);
              }
            }
            return;
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      socket.onclose = () => {
        if (!isMounted) return;
        setIsConnected(false);
        // Try reconnecting in 2.5s
        reconnectTimeout = setTimeout(connectWs, 2500);
      };

      socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        socket.close();
      };
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [room, currentUser.id]);

  // Upload files to Express server
  const handleUploadFiles = async (files: File[]): Promise<Attachment[]> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      return data.attachments as Attachment[];
    } finally {
      setIsUploading(false);
    }
  };

  // Send message
  const handleSendMessage = (text: string, attachments: Attachment[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message:send',
          text,
          attachments,
        })
      );
      setTimeout(() => scrollToBottom('smooth'), 50);
    }
  };

  // Broadcast typing status
  const handleSendTyping = (isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'user:typing',
          isTyping,
        })
      );
    }
  };

  // Delete message
  const handleDeleteMessage = (messageId: string) => {
    // Delete via WebSocket for instant broadcast
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message:delete',
          messageId,
        })
      );
    } else {
      // Fallback REST call
      fetch(`/api/messages/${messageId}?room=${encodeURIComponent(room)}`, {
        method: 'DELETE',
      }).catch(console.error);
    }
  };

  // Pin / Unpin message
  const handleTogglePin = (messageId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message:pin',
          messageId,
        })
      );
    }
  };

  // React with emoji
  const handleReact = (messageId: string, emoji: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message:react',
          messageId,
          emoji,
        })
      );
    }
  };

  // Clear room
  const handleConfirmClear = async () => {
    try {
      await fetch(`/api/rooms/${encodeURIComponent(room)}/clear`, {
        method: 'POST',
      });
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Failed to clear room:', err);
    }
  };

  // Export stream to file
  const handleExportStream = () => {
    const formatted = messages.map(m => `[${m.timestamp}] ${m.senderName}: ${m.text} ${m.attachments?.map(a => `(${a.originalName})`).join(' ')}`).join('\n\n');
    const blob = new Blob([formatted], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opencast-stream-${room}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save profile updates
  const handleSaveProfile = (updated: UserProfile) => {
    setCurrentUser(updated);
    saveUserProfile(updated);
    // Notify server of updated name/color
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'user:join',
          roomId: room,
          senderId: updated.id,
          senderName: updated.name,
          senderColor: updated.color,
        })
      );
    }
  };

  // Filter messages based on search query and file filter
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (filterFilesOnly && (!m.attachments || m.attachments.length === 0)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = m.text.toLowerCase().includes(q);
        const matchesSender = m.senderName.toLowerCase().includes(q);
        const matchesFile = m.attachments?.some((a) =>
          a.originalName.toLowerCase().includes(q)
        );
        return matchesText || matchesSender || matchesFile;
      }
      return true;
    });
  }, [messages, searchQuery, filterFilesOnly]);

  // Pinned messages list
  const pinnedMessages = useMemo(() => {
    return messages.filter((m) => m.isPinned);
  }, [messages]);

  // Array of typing names
  const typingList = Array.from(typingUsers.values());

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-text">
      {/* Top Navigation */}
      <Navbar
        room={room}
        onSelectRoom={handleSelectRoom}
        watchersCount={watchersCount}
        watchers={watchers}
        userProfile={currentUser}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenWatchers={() => setIsWatchersModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterFilesOnly={filterFilesOnly}
        onToggleFilterFiles={() => setFilterFilesOnly(!filterFilesOnly)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onClearRoom={() => setShowClearConfirm(true)}
        isConnected={isConnected}
      />

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && !searchQuery && !filterFilesOnly && (
        <div className="bg-amber-950/30 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
          <div className="max-w-5xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="flex items-center gap-1 font-semibold text-amber-400 shrink-0">
                <Pin className="w-3.5 h-3.5" /> Pinned:
              </span>
              <span className="truncate text-amber-100">
                {pinnedMessages[pinnedMessages.length - 1].text ||
                  `[File: ${pinnedMessages[pinnedMessages.length - 1].attachments?.[0]?.originalName}]`}
              </span>
            </div>
            <span className="text-[10px] text-amber-400/80 font-mono shrink-0">
              {pinnedMessages.length} pinned item{pinnedMessages.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Main Stream Area */}
      <main
        ref={streamContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 scroll-smooth"
      >
        <div className="max-w-4xl mx-auto space-y-3 pb-4">
          {/* Channel Hero Welcome Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  #{room} Live Stream
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Public Board
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Posts and files shared here appear instantaneously to anyone holding this link. No limits on text length, full media support, and real-time message deletion.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Share Link</span>
              </button>
              <button
                onClick={handleExportStream}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
                title="Export stream as text"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 border border-slate-700 transition"
                title="Clear all messages in this stream"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search / Filter active indicator */}
          {(searchQuery || filterFilesOnly) && (
            <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-emerald-400">Filtering:</span>
                {searchQuery && <span>"{searchQuery}"</span>}
                {filterFilesOnly && <span className="bg-slate-800 px-2 py-0.5 rounded">Attachments only</span>}
                <span className="text-slate-500">({filteredMessages.length} results)</span>
              </div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterFilesOnly(false);
                }}
                className="text-xs text-emerald-400 hover:underline"
              >
                Clear filter
              </button>
            </div>
          )}

          {/* Empty state */}
          {filteredMessages.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400 mb-3 shadow-lg">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">
                {searchQuery ? 'No matching messages found' : 'The stream is empty'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                {searchQuery
                  ? 'Try searching with a different keyword or clear the search filter.'
                  : 'Be the first to share! Type a note, paste an essay, upload files, or drop images below.'}
              </p>
              {!searchQuery && (
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() =>
                      handleSendMessage('👋 Hello everyone! Watching this stream live.', [])
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition"
                  >
                    Say Hello 👋
                  </button>
                  <button
                    onClick={() =>
                      handleSendMessage(
                        '📝 Here is a quick shared note. You can paste unlimited text here with no restrictions!',
                        []
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition"
                  >
                    Post a Note 📝
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Messages Feed */}
          {filteredMessages.map((msg, idx) => {
            const prevMsg = filteredMessages[idx - 1];
            const isDifferentDay =
              !prevMsg ||
              new Date(prevMsg.timestamp).toDateString() !==
                new Date(msg.timestamp).toDateString();

            return (
              <MessageItem
                key={msg.id}
                message={msg}
                currentUser={currentUser}
                onDeleteMessage={handleDeleteMessage}
                onTogglePin={handleTogglePin}
                onReact={handleReact}
                onPreviewImage={(url, name) => setPreviewImage({ url, name })}
                showDateDivider={isDifferentDay}
              />
            );
          })}

          {/* Real-time typing indicators */}
          {typingList.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-400 italic px-2 py-1 animate-pulse">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
              </span>
              <span>
                {typingList.join(', ')} {typingList.length > 1 ? 'are' : 'is'} typing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="fixed bottom-24 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-xl transition-all animate-bounce"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>New messages</span>
        </button>
      )}

      {/* Bottom Composer */}
      <MessageComposer
        onSendMessage={handleSendMessage}
        onSendTyping={handleSendTyping}
        isUploading={isUploading}
        onUploadFiles={handleUploadFiles}
        isConnected={isConnected}
      />

      {/* Lightbox Modal */}
      <LightboxModal
        isOpen={!!previewImage}
        imageUrl={previewImage?.url || null}
        imageName={previewImage?.name || ''}
        onClose={() => setPreviewImage(null)}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        room={room}
        onSwitchRoom={handleSelectRoom}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={currentUser}
        onSaveProfile={handleSaveProfile}
      />

      {/* Watchers Modal */}
      <WatchersModal
        isOpen={isWatchersModalOpen}
        onClose={() => setIsWatchersModalOpen(false)}
        watchers={watchers}
        currentUser={currentUser}
        room={room}
      />

      {/* Clear Room Confirm Modal */}
      {showClearConfirm && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowClearConfirm(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Clear entire stream?</h3>
                <p className="text-xs text-slate-400">Channel #{room}</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              This will permanently delete all messages and files in #{room} for everyone watching live. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
              >
                Yes, Clear Stream
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
