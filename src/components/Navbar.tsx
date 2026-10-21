import React, { useState } from 'react';
import { 
  Radio, 
  Share2, 
  Users, 
  Search, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Sparkles,
  Check,
  Hash,
  Filter,
  Paperclip
} from 'lucide-react';
import { UserProfile, Watcher } from '../types';

interface NavbarProps {
  room: string;
  onSelectRoom: (newRoom: string) => void;
  watchersCount: number;
  watchers: Watcher[];
  userProfile: UserProfile;
  onOpenProfile: () => void;
  onOpenShare: () => void;
  onOpenWatchers: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterFilesOnly: boolean;
  onToggleFilterFiles: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClearRoom: () => void;
  isConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  room,
  onSelectRoom,
  watchersCount,
  userProfile,
  onOpenProfile,
  onOpenShare,
  onOpenWatchers,
  searchQuery,
  onSearchChange,
  filterFilesOnly,
  onToggleFilterFiles,
  soundEnabled,
  onToggleSound,
  onClearRoom,
  isConnected,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [roomInput, setRoomInput] = useState(room);
  const [showSearch, setShowSearch] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = roomInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (cleaned && cleaned !== room) {
      onSelectRoom(cleaned);
    }
    setIsEditingRoom(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-3 sm:px-6 py-2.5 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Room info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-lg">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5 font-bold tracking-tight text-white leading-none">
                <span>OpenCast</span>
                <span className="flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                  {isConnected ? 'LIVE' : 'RECONNECTING'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Public Real-time Stream</p>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

          {/* Room Pill */}
          {isEditingRoom ? (
            <form onSubmit={handleRoomSubmit} className="flex items-center">
              <div className="relative flex items-center">
                <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2" />
                <input
                  type="text"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  onBlur={() => setIsEditingRoom(false)}
                  autoFocus
                  placeholder="channel-name"
                  className="pl-6 pr-2 py-1 text-xs bg-slate-800 border border-emerald-500 rounded-lg text-white outline-none w-32 sm:w-40"
                />
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                setRoomInput(room);
                setIsEditingRoom(true);
              }}
              title="Click to switch or create room"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-medium transition group"
            >
              <Hash className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
              <span className="font-semibold text-slate-100 max-w-[120px] truncate">{room}</span>
              <span className="text-[10px] text-slate-400 ml-1 bg-slate-700/50 px-1 py-0.5 rounded">change</span>
            </button>
          )}

          {/* Watchers Badge */}
          <button
            onClick={onOpenWatchers}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-900/40 transition"
            title="Active live watchers on this stream"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>{watchersCount}</span>
            <span className="hidden md:inline text-[11px] font-normal text-emerald-300/80">watching</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search Toggle */}
          {showSearch ? (
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
                className="pl-8 pr-7 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 outline-none w-36 sm:w-56 focus:border-emerald-500"
              />
              <button
                onClick={() => {
                  onSearchChange('');
                  setShowSearch(false);
                }}
                className="absolute right-2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-1.5 sm:px-2 sm:py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition text-xs flex items-center gap-1"
              title="Search messages"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Files Only Filter */}
          <button
            onClick={onToggleFilterFiles}
            className={`p-1.5 sm:px-2 sm:py-1 rounded-lg transition text-xs flex items-center gap-1 ${
              filterFilesOnly
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Filter by file attachments only"
          >
            <Paperclip className="w-4 h-4" />
            <span className="hidden md:inline">Files</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded-lg transition text-xs ${
              soundEnabled
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800'
            }`}
            title={soundEnabled ? 'Mute chimes' : 'Unmute chimes'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Share Button (Hero) */}
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition ${
              copiedLink
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
            }`}
            title="Copy link to share this live stream"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Copied Link!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share Link</span>
                <span className="sm:hidden">Share</span>
              </>
            )}
          </button>

          {/* User Profile Pill */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 transition"
            title="Customize your display name & color"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
              style={{ backgroundColor: userProfile.color }}
            >
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-slate-300 hidden md:inline max-w-[90px] truncate">
              {userProfile.name}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
