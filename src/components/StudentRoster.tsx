import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  UserPlus,
  Search,
  Filter,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Upload,
  Sparkles,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface Props {
  currentUser: { username: string; fullName: string; role: string };
  prefillName?: string;
}

const SAMPLE_AVATARS = [
  { name: 'Sarah Connor', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80' },
  { name: 'David Kim', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80' },
  { name: 'Amara Okafor', url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&auto=format&fit=crop&q=80' },
  { name: 'Lucas Rossi', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80' },
];

export const StudentRoster: React.FC<Props> = ({ currentUser, prefillName }) => {
  const { theme } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [classes, setClasses] = useState<string[]>([]);

  // Registration Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [studentId, setStudentId] = useState<string>('');
  const [fullName, setFullName] = useState<string>(prefillName || '');
  const [className, setClassName] = useState<string>('Computer Science 101');
  const [email, setEmail] = useState<string>('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
    faceCount?: number;
  } | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Camera state for registration
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students?className=${classFilter}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setStudents(data.students || []);
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
    fetchStudents();
  }, [classFilter, search]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (prefillName) {
      setFullName(prefillName);
      setStudentId(`STU-${Math.floor(1000 + Math.random() * 9000)}`);
      setIsModalOpen(true);
    }
  }, [prefillName]);

  // Validate face in photo
  const validatePhoto = async (dataUrl: string) => {
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch('/api/face/validate-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      const data = await res.json();
      setValidationResult(data);
    } catch (err: any) {
      setValidationResult({
        valid: false,
        message: 'Could not connect to face validation service',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setPhotoDataUrl(b64);
      validatePhoto(b64);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 640 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setIsCameraActive(false);
      setErrorMsg('Camera access is not permitted or unavailable. Please upload a student photo or select a sample portrait.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 400, 400);
      const b64 = canvas.toDataURL('image/jpeg', 0.9);
      setPhotoDataUrl(b64);

      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach((t) => t.stop());
      setIsCameraActive(false);
      validatePhoto(b64);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !fullName || !className || !photoDataUrl) {
      setErrorMsg('Please fill out all fields and provide a reference photograph.');
      return;
    }

    if (validationResult && !validationResult.valid) {
      setErrorMsg('Cannot register student: reference image does not meet biometric face requirements.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          full_name: fullName,
          class_name: className,
          email,
          image_path: photoDataUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register student');
      }

      setSuccessMsg(`Student ${fullName} registered with biometric encoding!`);
      setIsModalOpen(false);
      resetForm();
      fetchStudents();
      fetchClasses();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error registering student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStudentId('');
    setFullName('');
    setEmail('');
    setPhotoDataUrl('');
    setValidationResult(null);
    setErrorMsg(null);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to remove student "${name}"?`)) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStudents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className={`border rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${theme.cardClass}`}>
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${theme.textPrimary}`}>
            <UserCheck className="w-6 h-6" style={{ color: theme.primaryColor }} />
            Registered Student Database
          </h1>
          <p className={`text-sm mt-1 ${theme.textMuted}`}>
            Manage student reference portraits and 128-dimensional biometric facial encodings.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setStudentId(`CS-2026-00${students.length + 1}`);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center gap-2 shadow-lg transition"
          style={{ backgroundColor: theme.primaryColor }}
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Student</span>
        </motion.button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className={`border rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 ${theme.cardClass}`}>
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or student ID..."
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-auto"
          >
            <option value="all" className="bg-slate-900">All Classes ({students.length})</option>
            {classes.map((c) => (
              <option key={c} value={c} className="bg-slate-900">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table / Grid */}
      <div className={`border rounded-2xl overflow-hidden shadow-xl ${theme.cardClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Student ID</th>
                <th className="py-3.5 px-4">Enrolled Class</th>
                <th className="py-3.5 px-4">Biometric Status</th>
                <th className="py-3.5 px-4">Registration Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-medium text-white flex items-center gap-3">
                    <img
                      src={student.image_path}
                      alt={student.full_name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700 shadow-sm"
                    />
                    <div>
                      <span className="block font-semibold">{student.full_name}</span>
                      <span className="text-xs text-slate-400">{student.email || 'No email registered'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-emerald-400">{student.student_id}</td>
                  <td className="py-3 px-4 text-xs text-slate-300">{student.class_name}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      128-d Encodings Stored
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400">
                    {new Date(student.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(student.id, student.full_name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                      title="Remove Student"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Register Student & Biometric Encoding
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. CS-2026-008"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                    Class *
                  </label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Computer Science 101">Computer Science 101</option>
                    <option value="AI & Machine Learning">AI & Machine Learning</option>
                    <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Maya Lin"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Photo Input & Live Validation */}
              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Reference Portrait Photo *</span>
                  <span className="text-[11px] text-slate-400 font-normal">Must contain exactly 1 clear face</span>
                </label>

                {photoDataUrl ? (
                  <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between gap-4">
                    <img
                      src={photoDataUrl}
                      alt="Student Reference"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-600"
                    />

                    <div className="flex-1">
                      {isValidating ? (
                        <div className="text-xs text-amber-400 flex items-center gap-1.5 animate-pulse">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Validating face landmarks...</span>
                        </div>
                      ) : validationResult?.valid ? (
                        <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{validationResult.message}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-rose-400 flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>{validationResult?.message || 'Face validation failed'}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPhotoDataUrl('');
                        setValidationResult(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpeg,image/png"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4 text-emerald-400" />
                        <span>Upload Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4 text-cyan-400" />
                        <span>Use Webcam</span>
                      </button>
                    </div>

                    {/* Quick Preset Avatars */}
                    <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                      <span className="text-[11px] font-medium text-slate-400 block mb-2">
                        Or select a sample student headshot for testing:
                      </span>
                      <div className="flex gap-2">
                        {SAMPLE_AVATARS.map((avatar, idx) => (
                          <img
                            key={idx}
                            src={avatar.url}
                            alt={avatar.name}
                            onClick={() => {
                              setPhotoDataUrl(avatar.url);
                              setFullName((prev) => prev || avatar.name);
                              validatePhoto(avatar.url);
                            }}
                            className="w-10 h-10 rounded-full object-cover border-2 border-transparent hover:border-emerald-400 cursor-pointer transition hover:scale-105"
                            title={`Use ${avatar.name}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Webcam view if active inside modal */}
              {isCameraActive && (
                <div className="p-3 bg-black rounded-xl border border-slate-700 space-y-2">
                  <video ref={videoRef} autoPlay playsInline className="w-full aspect-square object-cover rounded-lg" />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCameraActive(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs text-white font-semibold flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Capture
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (validationResult !== null && !validationResult.valid)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Registering...' : 'Save & Encode Face'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
