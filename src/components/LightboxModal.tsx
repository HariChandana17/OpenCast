import React, { useEffect } from 'react';
import { X, Download, ZoomIn } from 'lucide-react';

interface LightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  imageName: string;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  imageUrl,
  imageName,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 transition-all"
      onClick={onClose}
    >
      {/* Top action bar */}
      <div 
        className="w-full max-w-5xl flex items-center justify-between text-white pb-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <ZoomIn className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium truncate max-w-xs sm:max-w-md">{imageName}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={imageUrl}
            download={imageName}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image */}
      <div 
        className="max-w-5xl max-h-[82vh] overflow-hidden flex items-center justify-center relative rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={imageName}
          className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
        />
      </div>
    </div>
  );
};
