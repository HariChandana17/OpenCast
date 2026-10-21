import React, { useState } from 'react';
import { X, Copy, Check, Link, Globe, Users, ShieldCheck, QrCode } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: string;
  onSwitchRoom: (newRoom: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  room,
  onSwitchRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [targetRoom, setTargetRoom] = useState('');
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const currentUrl = window.location.href;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateNewChannel = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = targetRoom.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (clean) {
      onSwitchRoom(clean);
      setTargetRoom('');
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-all"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl text-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Share Live Stream</h2>
              <p className="text-xs text-slate-400">Channel #{room}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Share Link box */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Public Sharable Link:
          </label>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 focus-within:border-emerald-500">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="bg-transparent text-xs text-slate-300 w-full outline-none px-2 select-all font-mono"
            />
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Informational perks */}
        <div className="mt-4 space-y-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Instant live sync:</strong> Anyone with this link sees new messages, deletes, and files in real-time.</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <span><strong>No account needed:</strong> Visitors can view and share without creating an account or signing up.</span>
          </div>
          <div className="flex items-start gap-2">
            <Link className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span><strong>No character limit:</strong> Share huge blocks of text, code, files, or quick notes freely.</span>
          </div>
        </div>

        {/* Switch / Create custom channel */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Switch or create another channel:
          </label>
          <form onSubmit={handleCreateNewChannel} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. project-x or notes-board"
              value={targetRoom}
              onChange={(e) => setTargetRoom(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!targetRoom.trim()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition disabled:opacity-50"
            >
              Go to channel
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
