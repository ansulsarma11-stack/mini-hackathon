import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClassroomCanvas } from './ClassroomCanvas';
import { DetectedFaceMatch, Student } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  UploadCloud,
  Camera,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  UserPlus,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';

interface AttendanceSubmissionItem {
  studentId: string;
  studentName: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  confidence: number;
  matchType: 'recognized' | 'uncertain' | 'unknown' | 'absent';
  auditNote: string;
  imagePath?: string;
}

interface Props {
  currentUser: { username: string; fullName: string; role: string };
  onNavigateToRecords: () => void;
  onNavigateToRegister: (prefillName?: string) => void;
}

// Preset high quality sample classroom photos for quick 1-click testing
const SAMPLE_CLASSROOMS = [
  {
    id: 'lab-cs101',
    name: 'CS-101 Lab (5 Students + 1 Visitor)',
    class: 'Computer Science 101',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80',
    description: 'Computer Science lab with multiple seated students and an unknown visitor.',
  },
  {
    id: 'seminar-ai',
    name: 'AI Seminar Group',
    class: 'AI & Machine Learning',
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&auto=format&fit=crop&q=80',
    description: 'Small group discussion in the Machine Learning conference room.',
  },
  {
    id: 'lecture-hall',
    name: 'Lecture Hall Front Rows',
    class: 'Computer Science 101',
    url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&auto=format&fit=crop&q=80',
    description: 'Front-row classroom perspective with clear frontal faces.',
  },
];

export const FaceAttendance: React.FC<Props> = ({
  currentUser,
  onNavigateToRecords,
  onNavigateToRegister,
}) => {
  const { theme } = useTheme();
  const [selectedClass, setSelectedClass] = useState<string>('Computer Science 101');
  const [sessionName, setSessionName] = useState<string>(
    `Lecture ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - Attendance`
  );
  const [threshold, setThreshold] = useState<number>(0.70);
  const [classes, setClasses] = useState<string[]>(['Computer Science 101', 'AI & Machine Learning']);

  const [imageUrl, setImageUrl] = useState<string>(SAMPLE_CLASSROOMS[0].url);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [detectionResults, setDetectionResults] = useState<{
    matches: DetectedFaceMatch[];
    enrolledCount: number;
    detectedCount: number;
    recognizedCount: number;
    uncertainCount: number;
    unknownCount: number;
    absentStudents: { student_id: string; full_name: string; image_path: string }[];
  } | null>(null);

  const [selectedFace, setSelectedFace] = useState<DetectedFaceMatch | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceSubmissionItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load classes
  useEffect(() => {
    fetch('/api/classes')
      .then((res) => res.json())
      .then((data) => {
        if (data.classes && data.classes.length > 0) {
          setClasses(data.classes);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // Pre-load default sample image or re-evaluate on class change
  useEffect(() => {
    handleRunRecognition(imageUrl || SAMPLE_CLASSROOMS[0].url);
  }, [selectedClass]);

  // Dynamically update match types when threshold slider is moved
  useEffect(() => {
    if (!detectionResults) return;

    const updatedMatches = detectionResults.matches.map((m) => {
      if (m.matchType === 'unknown') return m;
      const isRecognized = m.confidence >= threshold;
      return {
        ...m,
        matchType: (isRecognized ? 'recognized' : 'uncertain') as 'recognized' | 'uncertain',
      };
    });

    setDetectionResults((prev) =>
      prev
        ? {
            ...prev,
            matches: updatedMatches,
            recognizedCount: updatedMatches.filter((m) => m.matchType === 'recognized').length,
            uncertainCount: updatedMatches.filter((m) => m.matchType === 'uncertain').length,
          }
        : null
    );

    // Update attendance review items
    setAttendanceList((prev) =>
      prev.map((item) => {
        if (item.matchType === 'absent' || item.matchType === 'unknown') return item;
        const isRecognized = item.confidence >= threshold;
        return {
          ...item,
          status: isRecognized ? 'Present' : 'Late',
          matchType: (isRecognized ? 'recognized' : 'uncertain') as 'recognized' | 'uncertain',
        };
      })
    );
  }, [threshold]);

  // Convert image URL to base64 for API transmission
  const convertUrlToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return url;
    }
  };

  const handleRunRecognition = async (imgSource: string) => {
    setIsProcessing(true);
    setStatusMessage(null);
    setSelectedFace(null);

    try {
      let b64 = imgSource;
      if (!imgSource.startsWith('data:image/')) {
        b64 = await convertUrlToBase64(imgSource);
      }
      setImageBase64(b64);
      setImageUrl(imgSource);

      const res = await fetch('/api/face/detect-and-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: b64,
          className: selectedClass,
          threshold,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze classroom photo');
      }

      setDetectionResults(data);

      // Construct attendance review list
      const items: AttendanceSubmissionItem[] = [];

      // Add recognized and uncertain students
      data.matches.forEach((m: DetectedFaceMatch) => {
        if (m.studentId) {
          const isPresent = m.matchType === 'recognized' || m.confidence >= threshold;
          items.push({
            studentId: m.studentId,
            studentName: m.studentName,
            status: isPresent ? 'Present' : 'Late',
            confidence: m.confidence,
            matchType: m.matchType,
            auditNote: `Facial match (${Math.round(m.confidence * 100)}%): ${m.reasoning}`,
          });
        }
      });

      // Add remaining enrolled students as Absent
      if (data.absentStudents) {
        data.absentStudents.forEach((abs: any) => {
          items.push({
            studentId: abs.student_id,
            studentName: abs.full_name,
            status: 'Absent',
            confidence: 0,
            matchType: 'absent',
            auditNote: 'Student face not detected in classroom photograph',
            imagePath: abs.image_path,
          });
        });
      }

      setAttendanceList(items);

      if (data.unknownCount > 0) {
        setStatusMessage({
          type: 'info',
          text: `Analysis complete: ${data.recognizedCount} recognized students marked Present, and ${data.unknownCount} UNKNOWN face(s) flagged for manual verification!`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Facial analysis complete: ${data.recognizedCount} students recognized.`,
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error processing classroom image' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Please upload a valid image (JPEG, PNG)' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      handleRunRecognition(dataUri);
    };
    reader.readAsDataURL(file);
  };

  // Webcam Capture
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setIsCameraActive(false);
      setStatusMessage({
        type: 'info',
        text: 'Camera access is not permitted in this browser tab. You can use the quick test scenarios or upload a classroom photo.',
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/jpeg', 0.9);

      // Stop camera stream
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setIsCameraActive(false);
      handleRunRecognition(dataUri);
    }
  };

  const toggleStudentStatus = (studentId: string, newStatus: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    setAttendanceList((prev) =>
      prev.map((item) =>
        item.studentId === studentId
          ? {
              ...item,
              status: newStatus,
              auditNote: `Teacher override to ${newStatus} (${new Date().toLocaleTimeString()})`,
            }
          : item
      )
    );
  };

  const handleCommitAttendance = async () => {
    if (attendanceList.length === 0) {
      setStatusMessage({ type: 'error', text: 'No attendance records to commit.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      // 1. Create or get session ID
      const sessionRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_name: selectedClass,
          session_date: new Date().toISOString().split('T')[0],
          session_name: sessionName,
          created_by: currentUser.fullName,
        }),
      });

      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) {
        throw new Error(sessionData.error || 'Failed to create attendance session');
      }

      const sessionId = sessionData.sessionId;

      // 2. Submit records
      const submitRes = await fetch('/api/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          className: selectedClass,
          records: attendanceList,
          markedBy: currentUser.fullName,
        }),
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok) {
        throw new Error(submitData.error || 'Failed to commit attendance');
      }

      setStatusMessage({
        type: 'success',
        text: `Attendance saved successfully for "${sessionName}". ${submitData.message}`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save attendance' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Controls */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Biometric Recognition
              </span>
              <span className="text-xs text-slate-400">Classroom Vision v2.5</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1.5 flex items-center gap-2">
              Image-Based Attendance Processing
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Upload classroom photo or capture snapshot. Faces are detected and verified against registered biometric encodings.
            </p>
          </div>

          {/* Quick presets and upload actions */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/jpg"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm flex items-center gap-2 border border-slate-700 transition"
            >
              <UploadCloud className="w-4 h-4 text-emerald-400" />
              <span>Upload Custom Photo</span>
            </button>

            <button
              onClick={startCamera}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm flex items-center gap-2 border border-slate-700 transition"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Webcam Snapshot</span>
            </button>

            <button
              onClick={() => handleRunRecognition(imageUrl)}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Detecting Faces...' : 'Re-Analyze'}</span>
            </button>
          </div>
        </div>

        {/* Configuration Row: Class, Session name, and Threshold slider */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Target Class Roster
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="all">All Enrolled Students</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Attendance Session Label
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g. Morning Lecture - Week 4"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                Confidence Threshold
              </label>
              <span className="text-xs font-semibold text-emerald-400">
                {Math.round(threshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.50"
              max="0.90"
              step="0.05"
              value={threshold}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setThreshold(val);
              }}
              className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Higher threshold reduces false positives; lower recognizes side angles.
            </p>
          </div>
        </div>

        {/* Sample Classroom Scenarios Bar */}
        <div className="mt-4 pt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quick Test Scenarios:
          </span>
          {SAMPLE_CLASSROOMS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => {
                setSelectedClass(sample.class);
                handleRunRecognition(sample.url);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                imageUrl === sample.url
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700/60 hover:bg-slate-700'
              }`}
            >
              {sample.name}
            </button>
          ))}
        </div>
      </div>

      {/* Webcam Modal if active */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                Live Classroom Capture
              </h3>
              <button
                onClick={() => {
                  const stream = videoRef.current?.srcObject as MediaStream;
                  stream?.getTracks().forEach((t) => t.stop());
                  setIsCameraActive(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  const stream = videoRef.current?.srcObject as MediaStream;
                  stream?.getTracks().forEach((t) => t.stop());
                  setIsCameraActive(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Capture & Recognize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {statusMessage.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {statusMessage.type === 'info' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
          {statusMessage.type === 'success' && (
            <button
              onClick={onNavigateToRecords}
              className="text-xs underline font-semibold hover:text-white shrink-0"
            >
              View Attendance Records &rarr;
            </button>
          )}
        </div>
      )}

      {/* Main Analysis Section: Image Canvas + Biometric Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Classroom Canvas */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Classroom Vision Canvas
              </span>
              <div className="flex items-center gap-2 text-xs">
                {isProcessing ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 font-medium animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Extracting Biometrics & Matching Faces...
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {detectionResults?.detectedCount || 0} Faces Detected
                  </span>
                )}
              </div>
            </div>

            <ClassroomCanvas
              imageUrl={imageUrl}
              matches={detectionResults?.matches || []}
              selectedFaceId={selectedFace?.boxId || null}
              onSelectFace={(face) => setSelectedFace(face)}
              isScanning={isProcessing}
            />
          </div>
        </div>

        {/* Right Column: Biometric Inspector & Unknown Face Manager */}
        <div className="lg:col-span-4 space-y-4">
          {selectedFace ? (
            <div className={`border rounded-2xl p-5 shadow-xl space-y-4 ${theme.cardClass}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Biometric Inspector
                </span>
                <button
                  onClick={() => setSelectedFace(null)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Clear Selection
                </button>
              </div>

              {/* Match Header */}
              <div
                className={`p-4 rounded-xl border ${
                  selectedFace.matchType === 'recognized'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : selectedFace.matchType === 'uncertain'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {selectedFace.matchType === 'unknown' ? 'Unknown Visitor' : selectedFace.studentName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedFace.studentId ? `ID: ${selectedFace.studentId}` : 'Not in Registered Database'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      selectedFace.matchType === 'recognized'
                        ? 'bg-emerald-500 text-white'
                        : selectedFace.matchType === 'uncertain'
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {Math.round(selectedFace.confidence * 100)}% Match
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
                  <span className="font-semibold text-slate-400 block mb-1">Visual Rationale:</span>
                  <p className="italic text-slate-300">{selectedFace.reasoning}</p>
                </div>
              </div>

              {/* Actions for Selected Face */}
              {selectedFace.matchType === 'unknown' ? (
                <div className="space-y-2">
                  <p className="text-xs text-rose-300 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                    <strong className="block text-rose-200 mb-0.5">Flagged Unknown Face:</strong>
                    This face does not match any registered student above threshold. Per safety guidelines, unknown faces are NOT assigned to any student.
                  </p>
                  <button
                    onClick={() => onNavigateToRegister('New Student')}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>Register as New Student</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400">Attendance Action:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => toggleStudentStatus(selectedFace.studentId!, 'Present')}
                      className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                    >
                      Confirm Present
                    </button>
                    <button
                      onClick={() => toggleStudentStatus(selectedFace.studentId!, 'Absent')}
                      className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
                    >
                      Mark Absent
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-400" />
                Detection & Biometrics Overview
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
                  <span className="text-2xl font-black text-emerald-400">
                    {detectionResults?.recognizedCount ?? 0}
                  </span>
                  <span className="block text-[11px] font-medium text-slate-400 uppercase mt-1">
                    Recognized
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
                  <span className="text-2xl font-black text-rose-400">
                    {detectionResults?.unknownCount ?? 0}
                  </span>
                  <span className="block text-[11px] font-medium text-slate-400 uppercase mt-1">
                    Unknown Faces
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-400 space-y-2 pt-2 border-t border-slate-800">
                <p>
                  • <strong>Automated Matching:</strong> High confidence matches ({'>='} {Math.round(threshold * 100)}%) are automatically queued as Present.
                </p>
                <p>
                  • <strong>Unknown Face Flagging:</strong> Unmatched individuals are safely labeled as Unknown without compromising database integrity.
                </p>
                <p>
                  • <strong>Human-in-the-Loop Review:</strong> Teachers can review and adjust any mark before committing.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Twist: Flagged Unknown Faces Alert Card */}
      {detectionResults && detectionResults.unknownCount > 0 && (
        <div className="bg-rose-950/40 border-2 border-rose-500/40 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Flagged Unknown Faces ({detectionResults.unknownCount})</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Twist Feature Alert
                  </span>
                </h3>
                <p className="text-xs text-rose-200/80">
                  Detected faces with no matching biometric profile in the enrolled class database. Not assigned to any student.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateToRegister('New Student')}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 transition shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Unknown Face</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {detectionResults.matches
              .filter((m) => m.matchType === 'unknown')
              .map((unknownFace) => (
                <div
                  key={unknownFace.boxId}
                  onClick={() => setSelectedFace(unknownFace)}
                  className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/30 hover:border-rose-400 cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{unknownFace.studentName}</span>
                    <span className="text-[11px] text-slate-400">Coordinate Box: {unknownFace.boxId}</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition">
                    Inspect &rarr;
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Attendance Review & Confirmation Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Attendance Review & Confirmation
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review recognized identities and verify absentees before committing to the database.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCommitAttendance}
              disabled={isSubmitting || attendanceList.length === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Commit & Save Attendance'}</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Detection Status</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4 text-center">Mark Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {attendanceList.map((item) => {
                return (
                  <tr key={item.studentId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-xs text-slate-300">
                      {item.studentId}
                    </td>
                    <td className="py-3 px-4 font-medium text-white flex items-center gap-3">
                      {item.imagePath ? (
                        <img
                          src={item.imagePath}
                          alt={item.studentName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                          {item.studentName.charAt(0)}
                        </div>
                      )}
                      <span>{item.studentName}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">{selectedClass}</td>
                    <td className="py-3 px-4">
                      {item.matchType === 'recognized' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Recognized Face
                        </span>
                      )}
                      {item.matchType === 'uncertain' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Uncertain Match
                        </span>
                      )}
                      {item.matchType === 'absent' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-400 border border-slate-700">
                          <XCircle className="w-3.5 h-3.5" />
                          Not Detected
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-300">
                      {item.confidence > 0 ? `${Math.round(item.confidence * 100)}%` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700">
                        {(['Present', 'Absent', 'Late', 'Excused'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => toggleStudentStatus(item.studentId, st)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                              item.status === st
                                ? st === 'Present'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'Absent'
                                  ? 'bg-rose-600 text-white'
                                  : st === 'Late'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
