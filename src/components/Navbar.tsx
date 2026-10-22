import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  Palette,
  ChevronDown,
  Sparkles,
  Check
} from 'lucide-react';
import { useTheme, THEMES, ThemeId } from '../context/ThemeContext';

interface Props {
  activeTab: 'dashboard' | 'attendance' | 'students' | 'records';
  onSelectTab: (tab: 'dashboard' | 'attendance' | 'students' | 'records') => void;
  onOpenSecurity: () => void;
  onOpenLogin: () => void;
  currentUser: { username: string; fullName: string; role: string };
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  onOpenSecurity,
  onOpenLogin,
  currentUser,
}) => {
  const { theme, setThemeId } = useTheme();
  const [themeDropdownOpen, setThemeDropdownOpen] = useState<boolean>(false);

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance' as const, label: 'Take Attendance', icon: Camera },
    { id: 'students' as const, label: 'Student Roster', icon: Users },
    { id: 'records' as const, label: 'Records & Export', icon: FileSpreadsheet },
  ];

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-300 ${
      theme.isDark ? 'bg-slate-950/85 border-slate-800/80' : 'bg-white/90 border-slate-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand with glow animation */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onSelectTab('dashboard')}
          >
            <motion.div
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${theme.primaryColor}, #0284c7)`,
                boxShadow: `0 4px 20px ${theme.glowColor}`,
              }}
            >
              <Camera className="w-5 h-5 relative z-10" />
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-lg font-black tracking-tight ${theme.textPrimary}`}>
                  VisionAttend
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold border font-mono"
                  style={{
                    backgroundColor: `${theme.primaryColor}15`,
                    color: theme.primaryColor,
                    borderColor: `${theme.primaryColor}30`,
                  }}
                >
                  AI
                </span>
              </div>
              <p className={`text-[11px] leading-none ${theme.textMuted}`}>
                Biometric Face Attendance System
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs with Motion Pill */}
          <nav className={`hidden md:flex items-center gap-1 p-1.5 rounded-2xl border ${
            theme.isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'text-white'
                      : `${theme.textMuted} hover:${theme.textPrimary} hover:bg-black/5`
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBadge"
                      className="absolute inset-0 rounded-xl shadow-md z-0"
                      style={{
                        backgroundColor: theme.primaryColor,
                        boxShadow: `0 4px 15px ${theme.glowColor}`,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Theme Switcher, Safeguards, Profile */}
          <div className="flex items-center gap-2.5">
            {/* Theme Picker Dropdown */}
            <div className="relative">
              <button
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-medium ${
                  theme.isDark
                    ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
                title="Change Theme & Appearance"
              >
                <div
                  className="w-3.5 h-3.5 rounded-full shadow-sm"
                  style={{ backgroundColor: theme.primaryColor }}
                />
                <Palette className="w-3.5 h-3.5" />
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              <AnimatePresence>
                {themeDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute right-0 mt-2 w-56 rounded-2xl p-2 shadow-2xl border z-50 ${
                      theme.isDark
                        ? 'bg-slate-900 border-slate-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Color Theme
                    </div>
                    {Object.values(THEMES).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setThemeId(t.id);
                          setThemeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition ${
                          theme.id === t.id
                            ? theme.isDark
                              ? 'bg-slate-800 text-white'
                              : 'bg-slate-100 text-slate-900'
                            : 'hover:bg-black/5 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full shadow-sm"
                            style={{ backgroundColor: t.primaryColor }}
                          />
                          <div className="text-left">
                            <span className="block font-semibold">{t.name}</span>
                          </div>
                        </div>
                        {theme.id === t.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Safeguards Button */}
            <button
              onClick={onOpenSecurity}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                theme.isDark
                  ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Biometric Safety & Data Retention Policy"
            >
              <ShieldCheck className="w-4 h-4" style={{ color: theme.primaryColor }} />
              <span>Safeguards</span>
            </button>

            {/* User Profile Pill */}
            <button
              onClick={onOpenLogin}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition ${
                theme.isDark
                  ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
              }`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
                style={{
                  backgroundColor: `${theme.primaryColor}20`,
                  color: theme.primaryColor,
                }}
              >
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <span className="block text-xs font-bold leading-tight">{currentUser.fullName}</span>
                <span className="block text-[10px] opacity-70 uppercase tracking-wide">
                  {currentUser.role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className={`md:hidden flex items-center justify-around py-2 border-t text-xs ${
          theme.isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 transition ${
                  isActive ? 'font-bold' : 'opacity-60'
                }`}
                style={{ color: isActive ? theme.primaryColor : undefined }}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
