export interface Student {
  id: number;
  student_id: string;
  full_name: string;
  class_name: string;
  email?: string;
  image_path: string;
  created_at: string;
}

export interface BoundingBox {
  ymin: number; // 0 - 1000
  xmin: number; // 0 - 1000
  ymax: number; // 0 - 1000
  xmax: number; // 0 - 1000
}

export interface DetectedFaceMatch {
  boxId: string;
  box: BoundingBox;
  studentId: string | null;
  studentName: string;
  confidence: number;
  matchType: 'recognized' | 'uncertain' | 'unknown';
  reasoning: string;
}

export interface AttendanceRecord {
  id: number;
  student_id: string;
  full_name: string;
  class_name: string;
  session_id: number;
  session_name?: string;
  attendance_date: string;
  attendance_time: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  confidence: number;
  marked_by: string;
  audit_note?: string;
  image_path?: string;
}

export interface AttendanceSession {
  id: number;
  class_name: string;
  session_date: string;
  session_name: string;
  created_by: string;
  created_at: string;
  total_marked?: number;
  present_count?: number;
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'admin' | 'teacher';
}
