import React, { useState } from 'react';
import { 
  Trash2, 
  Copy, 
  Check, 
  Pin, 
  Download, 
  FileText, 
  Film, 
  Music, 
  ExternalLink, 
  Smile, 
  ChevronDown, 
  ChevronUp,
  FileArchive,
  Code
} from 'lucide-react';
import { Message, Attachment, UserProfile } from '../types';
import { formatTime, formatDate, formatFileSize } from '../utils/helpers';

interface MessageItemProps {
  message: Message;
  currentUser: UserProfile;
  onDeleteMessage: (messageId: string) => void;
  onTogglePin: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onPreviewImage: (url: string, name: string) => void;
  showDateDivider?: boolean;
}

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '🚀', '😂', '👀', '🎉'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  onDeleteMessage,
  onTogglePin,
  onReact,
  onPreviewImage,
  showDateDivider,
}) => {
  const [copied, setCopied] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const isOwner = message.senderId === currentUser.id;
  const isSystem = message.senderId === 'opencast_system';
  const charCount = message.text.length;
  const isVeryLong = charCount > 1000;

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    onDeleteMessage(message.id);
  };

  // Helper to render text with auto-links and code blocks
  const renderFormattedText = (rawText: string) => {
    const textToDisplay = isVeryLong && !isExpanded ? rawText.slice(0, 800) + '...' : rawText;

    // Detect if content has code blocks ```code```
    if (textToDisplay.includes('```')) {
      const parts = textToDisplay.split(/(```[\s\S]*?```)/g);
      return parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const codeContent = part.slice(3, -3).replace(/^[a-z]+\n/, ''); // strip optional lang identifier
          return (
            <div key={index} className="my-2 rounded-lg bg-slate-950/80 border border-slate-800 p-3 relative group">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 pb-1 border-b border-slate-800">
                <span className="flex items-center gap-1 font-mono text-emerald-400">
                  <Code className="w-3.5 h-3.5" /> code snippet
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(codeContent)}
                  className="hover:text-white px-2 py-0.5 rounded bg-slate-800/60 hover:bg-slate-800 text-[10px] transition"
                >
                  Copy code
                </button>
              </div>
              <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                {codeContent}
              </pre>
            </div>
          );
        }
        return <span key={index} className="whitespace-pre-wrap break-words">{renderWithLinks(part)}</span>;
      });
    }

    return <span className="whitespace-pre-wrap break-words">{renderWithLinks(textToDisplay)}</span>;
  };

  const renderWithLinks = (text: string) => {
    // Regex for URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const tokens = text.split(urlRegex);

    return tokens.map((token, i) => {
      if (urlRegex.test(token)) {
        return (
          <a
            key={i}
            href={token}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-0.5 break-all transition"
          >
            {token}
            <ExternalLink className="w-3 h-3 inline-block shrink-0 ml-0.5" />
          </a>
        );
      }
      return token;
    });
  };

  return (
    <div className="group relative">
      {showDateDivider && (
        <div className="flex items-center justify-center my-4">
          <div className="h-[1px] bg-slate-800 flex-1" />
          <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] font-medium text-slate-400">
            {formatDate(message.timestamp)}
          </span>
          <div className="h-[1px] bg-slate-800 flex-1" />
        </div>
      )}

      <div
        className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-xl transition-colors ${
          message.isPinned
            ? 'bg-amber-950/20 border border-amber-500/30'
            : isOwner
            ? 'bg-slate-900/60 hover:bg-slate-900 border border-slate-800/50'
            : 'bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/40'
        }`}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-md ring-2 ring-slate-800 select-none"
          style={{ backgroundColor: message.senderColor }}
        >
          {message.senderName.charAt(0).toUpperCase()}
        </div>

        {/* Content body */}
        <div className="flex-1 min-w-0">
          {/* Header row: Sender name, badges, timestamp */}
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-slate-200">
                {message.senderName}
              </span>
              {isOwner && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  You
                </span>
              )}
              {isSystem && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  System
                </span>
              )}
              {message.isPinned && (
                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Pin className="w-2.5 h-2.5" /> Pinned
                </span>
              )}
              <span className="text-xs text-slate-500">
                {formatTime(message.timestamp)}
              </span>
            </div>

            {/* Hover Actions Toolbar */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-lg p-0.5 shadow-lg backdrop-blur-sm">
              {/* Emoji reaction button */}
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded transition"
                  title="Add reaction"
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute right-0 top-full mt-1 z-20 flex items-center gap-1 p-1.5 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onReact(message.id, emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="hover:scale-125 transition-transform p-1 text-base rounded hover:bg-slate-700"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pin button */}
              <button
                onClick={() => onTogglePin(message.id)}
                className={`p-1 rounded transition ${
                  message.isPinned ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                }`}
                title={message.isPinned ? 'Unpin message' : 'Pin message'}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>

              {/* Copy text button */}
              {message.text && (
                <button
                  onClick={handleCopyText}
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded transition"
                  title="Copy message text"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}

              {/* Delete button (with confirm) */}
              <button
                onClick={handleDelete}
                onMouseLeave={() => setIsConfirmingDelete(false)}
                className={`p-1 rounded transition flex items-center gap-1 ${
                  isConfirmingDelete
                    ? 'bg-rose-500 text-white text-[11px] px-2 font-medium'
                    : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                }`}
                title="Delete message from live stream"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isConfirmingDelete && <span>Confirm delete</span>}
              </button>
            </div>
          </div>

          {/* Message Text (Unlimited length with auto-wrap) */}
          {message.text && (
            <div className="text-slate-300 text-sm sm:text-base leading-relaxed break-words font-normal">
              {renderFormattedText(message.text)}

              {/* Expand / Collapse toggle for long messages */}
              {isVeryLong && (
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" /> Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" /> Show full text
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {charCount.toLocaleString()} chars · {message.text.trim().split(/\s+/).length.toLocaleString()} words
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Attachments Section */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {message.attachments.map((file) => (
                <AttachmentCard
                  key={file.id}
                  attachment={file}
                  onPreviewImage={onPreviewImage}
                />
              ))}
            </div>
          )}

          {/* Reactions bar */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {Object.entries(message.reactions).map(([emoji, senders]) => {
                const hasReacted = senders.includes(currentUser.id);
                return (
                  <button
                    key={emoji}
                    onClick={() => onReact(message.id, emoji)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition border ${
                      hasReacted
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="text-[11px] font-mono">{senders.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-component for rendering attachments
interface AttachmentCardProps {
  attachment: Attachment;
  onPreviewImage: (url: string, name: string) => void;
}

const AttachmentCard: React.FC<AttachmentCardProps> = ({ attachment, onPreviewImage }) => {
  const isImage = attachment.mimeType.startsWith('image/');
  const isVideo = attachment.mimeType.startsWith('video/');
  const isAudio = attachment.mimeType.startsWith('audio/');

  if (isImage) {
    return (
      <div className="relative group rounded-xl overflow-hidden border border-slate-700/70 bg-slate-950 max-h-72 flex flex-col">
        <div 
          onClick={() => onPreviewImage(attachment.url, attachment.originalName)}
          className="cursor-pointer overflow-hidden relative flex items-center justify-center bg-black/40 min-h-[140px]"
        >
          <img
            src={attachment.url}
            alt={attachment.originalName}
            className="w-full h-auto object-cover max-h-64 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="bg-slate-900/90 text-white text-xs px-2.5 py-1 rounded-full font-medium shadow-md">
              Click to view full image
            </span>
          </div>
        </div>
        <div className="p-2 flex items-center justify-between bg-slate-900 text-xs text-slate-300 border-t border-slate-800">
          <span className="truncate max-w-[200px]" title={attachment.originalName}>
            {attachment.originalName}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">{formatFileSize(attachment.size)}</span>
            <a
              href={attachment.url}
              download={attachment.originalName}
              className="p-1 hover:text-emerald-400 rounded transition"
              title="Download image"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="rounded-xl overflow-hidden border border-slate-700/70 bg-slate-950 p-1 flex flex-col gap-1">
        <video
          src={attachment.url}
          controls
          preload="metadata"
          className="rounded-lg w-full max-h-64 object-cover"
        />
        <div className="px-2 py-1 flex items-center justify-between text-xs text-slate-300">
          <span className="truncate font-medium flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            {attachment.originalName}
          </span>
          <a
            href={attachment.url}
            download={attachment.originalName}
            className="p-1 hover:text-emerald-400 transition"
            title="Download video"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="rounded-xl border border-slate-700/70 bg-slate-900 p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-200">
          <span className="font-medium flex items-center gap-1.5 truncate">
            <Music className="w-4 h-4 text-emerald-400 shrink-0" />
            {attachment.originalName}
          </span>
          <span className="text-[11px] text-slate-500">{formatFileSize(attachment.size)}</span>
        </div>
        <audio src={attachment.url} controls className="w-full h-8" />
      </div>
    );
  }

  // Document / Archive / General File
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-700/70 bg-slate-900/90 hover:bg-slate-800/80 transition group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0 group-hover:bg-emerald-500/10 transition">
          {attachment.mimeType.includes('zip') || attachment.mimeType.includes('tar') || attachment.mimeType.includes('rar') ? (
            <FileArchive className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-200 truncate" title={attachment.originalName}>
            {attachment.originalName}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            {formatFileSize(attachment.size)}
          </p>
        </div>
      </div>
      <a
        href={attachment.url}
        download={attachment.originalName}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 group-hover:bg-emerald-600 text-slate-200 group-hover:text-white text-xs font-medium transition shadow-sm shrink-0 ml-2"
        title="Download file"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Download</span>
      </a>
    </div>
  );
};
