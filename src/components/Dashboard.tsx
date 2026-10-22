import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'motion/react';
import {
  Users,
  UserCheck,
  UserX,
  Percent,
  Camera,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Clock,
  Layers,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  onNavigate: (tab: 'attendance' | 'students' | 'records' | 'security') => void;
  currentUser: { username: string; fullName: string; role: string };
}

export const Dashboard: React.FC<Props> = ({ onNavigate, currentUser }) => {
  const { theme } = useTheme();
  const [stats, setStats] = useState<{
    totalStudents: number;
    presentToday: number;
    absentToday: number;
    attendanceRate: number;
    recentActivity: Array<{
      id: number;
      studentId: string;
      studentName: string;
      className: string;
      status: string;
      confidence: number;
      time: string;
      markedBy: string;
    }>;
    classDistribution: Array<{ className: string; count: number }>;
  } | null>(null);

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err));
  }, []);

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.08,
        duration: 0.35,
        ease: 'easeOut',
      },
    }),
  };

  return (
    <div className="space-y-6">
      {/* Animated Hero Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={`border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-colors duration-300 ${
          theme.isDark
            ? 'bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950 border-white/10'
            : 'bg-gradient-to-r from-white via-slate-50 to-emerald-50/40 border-slate-200'
        }`}
      >
        <div
          className="absolute -right-10 -top-10 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: theme.primaryColor }}
        />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-2 font-mono"
              style={{
                backgroundColor: `${theme.primaryColor}15`,
                color: theme.primaryColor,
                borderColor: `${theme.primaryColor}30`,
              }}
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Biometric Face Recognition System</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight ${theme.textPrimary}`}>
              Welcome back, {currentUser.fullName}
            </h1>
            <p className={`text-sm mt-1.5 max-w-xl leading-relaxed ${theme.textMuted}`}>
              Classroom facial recognition engine ready. Upload a photo or select a live session to detect students, verify identities, and record attendance.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('attendance')}
            className="px-6 py-3.5 rounded-2xl text-white font-semibold text-sm flex items-center gap-2.5 shadow-xl transition shrink-0"
            style={{
              backgroundColor: theme.primaryColor,
              boxShadow: `0 8px 25px ${theme.glowColor}`,
            }}
          >
            <Camera className="w-5 h-5" />
            <span>Launch Photo Attendance</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>

      {/* 4 Animated Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className={`border rounded-2xl p-5 shadow-lg relative group transition ${theme.cardClass}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${theme.textMuted}`}>
              Enrolled Students
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-3xl font-black ${theme.textPrimary}`}>
              {stats?.totalStudents ?? 0}
            </span>
            <span className={`block text-xs mt-1 ${theme.textMuted}`}>Biometrically encoded profiles</span>
          </div>
        </motion.div>

        {/* Present Today */}
        <motion.div
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className={`border rounded-2xl p-5 shadow-lg relative group transition ${theme.cardClass}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Present Today
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-emerald-400">
              {stats?.presentToday ?? 0}
            </span>
            <span className={`block text-xs mt-1 ${theme.textMuted}`}>Confirmed in active sessions</span>
          </div>
        </motion.div>

        {/* Absent Today */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className={`border rounded-2xl p-5 shadow-lg relative group transition ${theme.cardClass}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
              Absent Today
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-rose-400">
              {stats?.absentToday ?? 0}
            </span>
            <span className={`block text-xs mt-1 ${theme.textMuted}`}>Unmatched in classroom photos</span>
          </div>
        </motion.div>

        {/* Attendance Rate */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className={`border rounded-2xl p-5 shadow-lg relative group transition ${theme.cardClass}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Today's Attendance
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-cyan-400">
              {stats?.attendanceRate ?? 0}%
            </span>
            <div className="w-full bg-slate-800/50 h-2 rounded-full mt-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats?.attendanceRate ?? 0}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="bg-cyan-400 h-full rounded-full"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* 2-Column Section: Recent Stream & Class Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Attendance Stream */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`lg:col-span-7 border rounded-2xl p-6 shadow-xl ${theme.cardClass}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
              <h2 className={`text-base font-bold ${theme.textPrimary}`}>Recent Attendance Activity</h2>
            </div>
            <button
              onClick={() => onNavigate('records')}
              className="text-xs font-semibold hover:underline"
              style={{ color: theme.primaryColor }}
            >
              Full Log &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {!stats?.recentActivity?.length ? (
              <p className={`text-xs py-6 text-center ${theme.textMuted}`}>No recent attendance entries.</p>
            ) : (
              stats.recentActivity.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className={`flex items-center justify-between p-3 rounded-xl border transition ${
                    theme.isDark ? 'bg-black/20 border-white/5 hover:bg-black/30' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700/60 flex items-center justify-center font-bold text-xs text-slate-300">
                      {item.studentName.charAt(0)}
                    </div>
                    <div>
                      <span className={`text-xs font-bold block ${theme.textPrimary}`}>{item.studentName}</span>
                      <span className={`text-[11px] ${theme.textMuted}`}>{item.className}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        item.status === 'Present'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {item.status} ({Math.round(item.confidence * 100)}%)
                    </span>
                    <span className={`text-[11px] font-mono flex items-center gap-1 ${theme.textMuted}`}>
                      <Clock className="w-3 h-3" /> {item.time}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Class Enrollment Breakdown & Shortcuts */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className={`border rounded-2xl p-6 shadow-xl ${theme.cardClass}`}
          >
            <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${theme.textPrimary}`}>
              <Layers className="w-5 h-5 text-indigo-400" />
              Class Enrolment Roster
            </h2>
            <div className="space-y-3">
              {stats?.classDistribution?.map((c) => (
                <div
                  key={c.className}
                  className={`p-3 rounded-xl border ${
                    theme.isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className={`font-semibold ${theme.textPrimary}`}>{c.className}</span>
                    <span className={theme.textMuted}>{c.count} students</span>
                  </div>
                  <div className="w-full bg-slate-700/40 h-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (c.count / (stats.totalStudents || 1)) * 100)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('students')}
              className={`p-4 rounded-2xl border transition text-left group ${theme.cardClass}`}
            >
              <Users className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition" />
              <span className={`block text-xs font-bold ${theme.textPrimary}`}>Student Database</span>
              <span className={`text-[11px] ${theme.textMuted}`}>Add or edit student encodings</span>
            </motion.button>

            <motion.button
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('records')}
              className={`p-4 rounded-2xl border transition text-left group ${theme.cardClass}`}
            >
              <FileSpreadsheet className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition" />
              <span className={`block text-xs font-bold ${theme.textPrimary}`}>Export CSV</span>
              <span className={`text-[11px] ${theme.textMuted}`}>Download attendance sheets</span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
