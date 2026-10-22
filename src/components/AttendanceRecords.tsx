import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AttendanceRecord } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  Download,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Edit2,
  ShieldAlert,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';

interface Props {
  currentUser: { username: string; fullName: string; role: string };
}

export const AttendanceRecords: React.FC<Props> = ({ currentUser }) => {
  const { theme } = useTheme();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [classes, setClasses] = useState<string[]>([]);

  // Editing state for manual teacher correction with audit trail
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<'Present' | 'Absent' | 'Late' | 'Excused'>('Present');
  const [auditReason, setAuditReason] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClass !== 'all') params.append('className', selectedClass);
      if (selectedDate) params.append('date', selectedDate);

      const res = await fetch(`/api/attendance/records?${params.toString()}`);
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      setClasses(data.classes || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [selectedClass, selectedDate]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/attendance/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          auditNote: auditReason || `Status changed from ${editingRecord.status} to ${newStatus}`,
          updatedBy: currentUser.fullName,
        }),
      });

      if (res.ok) {
        setEditingRecord(null);
        setAuditReason('');
        fetchRecords();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (selectedClass !== 'all') params.append('className', selectedClass);
    if (selectedDate) params.append('date', selectedDate);
    window.location.href = `/api/attendance/export?${params.toString()}`;
  };

  // Filter records by search query
  const filteredRecords = records.filter(
    (r) =>
      r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.student_id?.toLowerCase().includes(search.toLowerCase()) ||
      r.session_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Summary counts
  const total = filteredRecords.length;
  const presentCount = filteredRecords.filter((r) => r.status === 'Present').length;
  const absentCount = filteredRecords.filter((r) => r.status === 'Absent').length;
  const lateCount = filteredRecords.filter((r) => r.status === 'Late').length;
  const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header and Export Action */}
      <div className={`border rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${theme.cardClass}`}>
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${theme.textPrimary}`}>
            <FileSpreadsheet className="w-6 h-6" style={{ color: theme.primaryColor }} />
            Attendance Records & Audit Log
          </h1>
          <p className={`text-sm mt-1 ${theme.textMuted}`}>
            Historical attendance sessions, biometric confidence logs, and teacher corrections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ rotate: 180 }}
            onClick={fetchRecords}
            className={`p-2.5 rounded-xl border transition ${
              theme.isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Refresh Records"
          >
            <RefreshCw className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center gap-2 shadow-lg transition"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Report</span>
          </motion.button>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`border rounded-2xl p-4 shadow-sm ${theme.cardClass}`}>
          <span className={`text-xs font-medium uppercase tracking-wider block ${theme.textMuted}`}>Total Logs</span>
          <span className={`text-2xl font-bold mt-1 block ${theme.textPrimary}`}>{total}</span>
        </div>
        <div className={`border rounded-2xl p-4 shadow-sm ${theme.cardClass}`}>
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider block">Present</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">{presentCount}</span>
        </div>
        <div className={`border rounded-2xl p-4 shadow-sm ${theme.cardClass}`}>
          <span className="text-xs font-medium text-rose-400 uppercase tracking-wider block">Absent</span>
          <span className="text-2xl font-bold text-rose-400 mt-1 block">{absentCount}</span>
        </div>
        <div className={`border rounded-2xl p-4 shadow-sm ${theme.cardClass}`}>
          <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider block">Attendance Rate</span>
          <span className="text-2xl font-bold text-cyan-400 mt-1 block">{attendanceRate}%</span>
        </div>
      </div>

      {/* Filter Row */}
      <div className={`border rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 ${theme.cardClass}`}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, ID, or session..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Class & Session</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Confidence</th>
                <th className="py-3.5 px-4">Marked By / Audit Log</th>
                <th className="py-3.5 px-4 text-right">Correct</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                    No attendance records found matching filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-medium text-white flex items-center gap-3">
                      {rec.image_path ? (
                        <img
                          src={rec.image_path}
                          alt={rec.full_name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                          {rec.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <span className="block font-semibold">{rec.full_name}</span>
                        <span className="text-xs font-mono text-slate-400">{rec.student_id}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="block text-slate-200 text-xs font-medium">{rec.class_name}</span>
                      <span className="text-[11px] text-slate-400">{rec.session_name || 'Class Session'}</span>
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-300 whitespace-nowrap">
                      <span className="block">{rec.attendance_date}</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {rec.attendance_time}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          rec.status === 'Present'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : rec.status === 'Absent'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : rec.status === 'Late'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {rec.status === 'Present' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {rec.status === 'Absent' && <XCircle className="w-3.5 h-3.5" />}
                        {rec.status === 'Late' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {rec.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-xs font-mono text-slate-300">
                      {rec.confidence > 0 ? `${Math.round(rec.confidence * 100)}%` : 'Manual'}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-400 max-w-xs truncate">
                      <span className="block text-slate-300">{rec.marked_by}</span>
                      {rec.audit_note && <span className="text-[11px] text-slate-400 italic block">{rec.audit_note}</span>}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingRecord(rec);
                          setNewStatus(rec.status);
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition"
                        title="Correct Record"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teacher Correction Modal with Audit Trail */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                Correct Attendance Record
              </h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs space-y-1">
              <p className="text-white font-medium">{editingRecord.full_name} ({editingRecord.student_id})</p>
              <p className="text-slate-400">{editingRecord.class_name} • {editingRecord.attendance_date}</p>
            </div>

            <form onSubmit={handleUpdateRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  New Attendance Status
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Present', 'Absent', 'Late', 'Excused'] as const).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setNewStatus(st)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition ${
                        newStatus === st
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Audit Trail Reason / Justification *
                </label>
                <input
                  type="text"
                  required
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  placeholder="e.g. Student arrived with medical slip; face shadowed in photo"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25"
                >
                  {isUpdating ? 'Saving...' : 'Save Audit Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
