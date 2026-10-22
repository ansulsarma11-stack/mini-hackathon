import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 'cyber-emerald' | 'midnight-indigo' | 'amber-terminal' | 'clean-light';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  primaryColor: string;
  accentClass: string;
  bgClass: string;
  cardClass: string;
  borderClass: string;
  textPrimary: string;
  textMuted: string;
  glowColor: string;
  isDark: boolean;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  'cyber-emerald': {
    id: 'cyber-emerald',
    name: 'Cyber Matrix',
    tagline: 'Neon emerald & dark obsidian biometric scanner',
    primaryColor: '#10b981',
    accentClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    bgClass: 'bg-slate-950 text-slate-100',
    cardClass: 'bg-slate-900/90 border-slate-800',
    borderClass: 'border-slate-800',
    textPrimary: 'text-white',
    textMuted: 'text-slate-400',
    glowColor: 'rgba(16, 185, 129, 0.35)',
    isDark: true,
  },
  'midnight-indigo': {
    id: 'midnight-indigo',
    name: 'Midnight Sapphire',
    tagline: 'Deep university navy with electric sapphire & violet',
    primaryColor: '#6366f1',
    accentClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    bgClass: 'bg-slate-950 text-slate-100',
    cardClass: 'bg-indigo-950/40 border-indigo-900/40',
    borderClass: 'border-indigo-900/40',
    textPrimary: 'text-white',
    textMuted: 'text-indigo-200/70',
    glowColor: 'rgba(99, 102, 241, 0.35)',
    isDark: true,
  },
  'amber-terminal': {
    id: 'amber-terminal',
    name: 'Amber Sentinel',
    tagline: 'Carbon tactical security HUD with amber laser optics',
    primaryColor: '#f59e0b',
    accentClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    bgClass: 'bg-neutral-950 text-neutral-100',
    cardClass: 'bg-neutral-900/90 border-amber-900/30',
    borderClass: 'border-neutral-800',
    textPrimary: 'text-white',
    textMuted: 'text-amber-100/60',
    glowColor: 'rgba(245, 158, 11, 0.35)',
    isDark: true,
  },
  'clean-light': {
    id: 'clean-light',
    name: 'Nordic Daylight',
    tagline: 'Refined crisp daylight theme with soft shadows',
    primaryColor: '#059669',
    accentClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    bgClass: 'bg-slate-50 text-slate-800',
    cardClass: 'bg-white border-slate-200 shadow-md shadow-slate-200/50',
    borderClass: 'border-slate-200',
    textPrimary: 'text-slate-900',
    textMuted: 'text-slate-500',
    glowColor: 'rgba(5, 150, 105, 0.15)',
    isDark: false,
  },
};

interface ThemeContextType {
  theme: ThemeConfig;
  setThemeId: (id: ThemeId) => void;
  scannerHudActive: boolean;
  setScannerHudActive: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES['cyber-emerald'],
  setThemeId: () => {},
  scannerHudActive: true,
  setScannerHudActive: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('visionattend_theme');
    return (saved as ThemeId) || 'cyber-emerald';
  });

  const [scannerHudActive, setScannerHudActive] = useState<boolean>(true);

  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
    localStorage.setItem('visionattend_theme', id);
  };

  const currentTheme = THEMES[themeId] || THEMES['cyber-emerald'];

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        setThemeId,
        scannerHudActive,
        setScannerHudActive,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
