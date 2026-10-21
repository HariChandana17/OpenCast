import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Smile, 
  X, 
  FileText, 
  Loader2, 
  Image as ImageIcon,
  UploadCloud,
  CornerDownLeft
} from 'lucide-react';
import { Attachment } from '../types';
import { formatFileSize } from '../utils/helpers';

interface MessageComposerProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  onSendTyping: (isTyping: boolean) => void;
  isUploading: boolean;
  onUploadFiles: (files: File[]) => Promise<Attachment[]>;
  isConnected: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🚀', '🙌', '💡', '🎉'];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onSendTyping,
  isUploading,
  onUploadFiles,
  isConnected,
}) => {
  const [text, setText] = useState('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagedAttachments, setStagedAttachments] = useState<Attachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 44), 220)}px`;
    }
  }, [text]);

  // Handle typing broadcasts
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    onSendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 1800);
  };

  // Clipboard paste listener (e.g. screenshots or files)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const filesArray = Array.from(e.clipboardData.files);
      handleFilesAdded(filesArray);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      handleFilesAdded(filesArray);
    }
  };

  const handleFilesAdded = async (files: File[]) => {
    setUploadError(null);
    try {
      const uploaded = await onUploadFiles(files);
      setStagedAttachments(prev => [...prev, ...uploaded]);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload file(s)');
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setStagedAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSend = () => {
    if ((!text.trim() && stagedAttachments.length === 0) || isUploading) {
      return;
    }

    onSendMessage(text, stagedAttachments);
    setText('');
    setStagedAttachments([]);
    setShowEmojiBar(false);
    setUploadError(null);
    onSendTyping(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const charCount = text.length;

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-t border-slate-800 bg-slate-900/95 backdrop-blur-md px-3 sm:px-6 py-3 transition-colors ${
        isDragOver ? 'bg-emerald-950/40 ring-2 ring-emerald-500 ring-inset' : ''
      }`}
    >
      <div className="max-w-4xl mx-auto">
        {/* Drag-over banner */}
        {isDragOver && (
          <div className="mb-2 p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center gap-2 text-emerald-300 text-xs font-semibold animate-pulse">
            <UploadCloud className="w-4 h-4" />
            Drop files here to upload and share publicly
          </div>
        )}

        {/* Upload error alert */}
        {uploadError && (
          <div className="mb-2 p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Attachment preview chips */}
        {stagedAttachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
            {stagedAttachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs text-slate-200 group relative"
              >
                {att.mimeType.startsWith('image/') ? (
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="max-w-[140px] truncate font-medium">{att.originalName}</span>
                <span className="text-[10px] text-slate-400 font-mono">({formatFileSize(att.size)})</span>
                <button
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="text-slate-400 hover:text-rose-400 ml-1 p-0.5 rounded transition"
                  title="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Quick Emojis strip */}
        {showEmojiBar && (
          <div className="mb-2 flex items-center gap-1.5 p-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl shadow-lg">
            <span className="text-[11px] text-slate-400 font-medium px-1">Quick:</span>
            {QUICK_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleInsertEmoji(emoji)}
                className="p-1 text-base hover:scale-125 transition-transform hover:bg-slate-700 rounded"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Main Input Box */}
        <div className="relative rounded-2xl bg-slate-950 border border-slate-800 focus-within:border-emerald-500/80 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-inner">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Type any message (no character limit) or paste screenshots / files..."
            rows={1}
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base px-3.5 pt-3 pb-2 resize-none outline-none leading-relaxed block overflow-y-auto"
            style={{ maxHeight: '220px' }}
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-slate-800/50">
            {/* Left buttons: Attach file, Emoji picker, Character counter */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFilesAdded(Array.from(e.target.files));
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                title="Attach files, images, videos or documents (up to 50MB)"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="hidden sm:inline">Attach</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEmojiBar(!showEmojiBar)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                title="Insert emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Character Strength / Limitless badge */}
              <div className="text-[11px] text-slate-400 font-mono ml-1 flex items-center gap-1">
                <span className={charCount > 1000 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {charCount.toLocaleString()}
                </span>
                <span className="hidden md:inline text-slate-400">/ ∞ chars (no limit)</span>
              </div>
            </div>

            {/* Right button: Send */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 hidden sm:inline flex items-center gap-0.5">
                Press <CornerDownLeft className="w-2.5 h-2.5 inline" /> Enter to send
              </span>
              <button
                type="button"
                onClick={handleSend}
                disabled={(!text.trim() && stagedAttachments.length === 0) || isUploading || !isConnected}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <span>Share</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
