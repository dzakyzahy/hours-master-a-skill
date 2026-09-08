export interface AvatarPreset {
  id: string;
  name: string;
  gradient: string;
  textColor: string;
  accent: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'cyber-neon',
    name: 'Electric Blue',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
    textColor: '#ffffff',
    accent: '#38bdf8'
  },
  {
    id: 'emerald-coder',
    name: 'Emerald Matrix',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    textColor: '#ffffff',
    accent: '#34d399'
  },
  {
    id: 'sunset-flow',
    name: 'Solar Flare',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #ef4444 100%)',
    textColor: '#ffffff',
    accent: '#fb923c'
  },
  {
    id: 'amethyst-focus',
    name: 'Neon Violet',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)',
    textColor: '#ffffff',
    accent: '#c084fc'
  },
  {
    id: 'minimal-dark',
    name: 'Stealth Slate',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    textColor: '#f8fafc',
    accent: '#64748b'
  },
  {
    id: 'gold-master',
    name: 'Cyber Gold',
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    textColor: '#ffffff',
    accent: '#fde047'
  }
];

export interface AvatarDisplay {
  isCustomImage: boolean;
  imageUrl?: string;
  gradient: string;
  textColor: string;
  initials: string;
}

export function getAvatarDisplay(avatarValue?: string, initials = 'U'): AvatarDisplay {
  const val = (avatarValue || '').trim();

  // If it's a base64 or https image
  if (val.startsWith('data:image') || val.startsWith('http://') || val.startsWith('https://')) {
    return {
      isCustomImage: true,
      imageUrl: val,
      gradient: 'none',
      textColor: '#ffffff',
      initials
    };
  }

  // Check if matches a preset
  const preset = AVATAR_PRESETS.find(p => p.id === val);
  if (preset) {
    return {
      isCustomImage: false,
      gradient: preset.gradient,
      textColor: preset.textColor,
      initials
    };
  }

  // Default fallback
  return {
    isCustomImage: false,
    gradient: AVATAR_PRESETS[0].gradient,
    textColor: '#ffffff',
    initials
  };
}

export function formatUserHeadline(title?: string, bio?: string) {
  return {
    title: (title || '').trim() || 'Skill Master',
    bio: (bio || '').trim() || 'Belajar dan bertumbuh di Skillo'
  };
}
