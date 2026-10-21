import React from 'react';
import { X, Users, Eye, Circle } from 'lucide-react';
import { Watcher, UserProfile } from '../types';

interface WatchersModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchers: Watcher[];
  currentUser: UserProfile;
  room: string;
}

export const WatchersModal: React.FC<WatchersModalProps> = ({
  isOpen,
  onClose,
  watchers,
  currentUser,
  room,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-all"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Live Watchers ({watchers.length})</h2>
              <p className="text-xs text-slate-400">Viewing #{room} in real-time</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 max-h-72 overflow-y-auto space-y-2">
          {watchers.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No active watchers right now</p>
          ) : (
            watchers.map((w, idx) => {
              const isYou = w.senderId === currentUser.id;
              return (
                <div
                  key={`${w.senderId}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow"
                      style={{ backgroundColor: w.senderColor || '#10b981' }}
                    >
                      {w.senderName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-200">
                          {w.senderName}
                        </span>
                        {isYou && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Active viewer
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>online</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
