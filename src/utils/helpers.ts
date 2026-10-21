import { UserProfile } from '../types';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

const DEFAULT_NAMES = [
  'Atlas Rider', 'Neon Finch', 'Solar Nomad', 'Echo Wanderer',
  'Cyber Fox', 'Velvet Pulse', 'Lunar Spark', 'Quantum Wave',
  'Starlight Otter', 'Cosmic Scout', 'Blaze Horizon', 'Silver Drift'
];

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'
];

export function getOrCreateUserProfile(): UserProfile {
  const stored = localStorage.getItem('opencast_user_profile');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.id && parsed.name) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  const randomName = DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)];
  const randomColor = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
  const newProfile: UserProfile = {
    id: 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
    name: randomName,
    color: randomColor
  };

  localStorage.setItem('opencast_user_profile', JSON.stringify(newProfile));
  return newProfile;
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem('opencast_user_profile', JSON.stringify(profile));
}

// Gentle synth audio chime using Web Audio API for incoming messages
export function playChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Audio might be blocked until user interacts, fail silently
  }
}
