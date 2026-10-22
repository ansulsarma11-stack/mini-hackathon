import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';

let dbInstance: Database | null = null;
const DB_PATH = path.resolve(process.cwd(), 'attendance.sqlite');

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  initTables(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  const data = dbInstance.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function initTables(db: Database) {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'teacher',
      created_at TEXT NOT NULL
    );
  `);

  // Students table
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      email TEXT,
      face_encoding TEXT,
      image_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Attendance Sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      session_date TEXT NOT NULL,
      session_name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Attendance table
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      class_name TEXT NOT NULL,
      session_id INTEGER NOT NULL,
      attendance_date TEXT NOT NULL,
      attendance_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Present',
      confidence REAL DEFAULT 1.0,
      marked_by TEXT NOT NULL,
      audit_note TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(student_id, session_id)
    );
  `);

  // Seed default users if empty
  const userCheck = db.exec("SELECT COUNT(*) as count FROM users;");
  const userCount = userCheck[0]?.values[0]?.[0] as number;
  if (!userCount) {
    const now = new Date().toISOString();
    // Pre-seed admin and teacher
    db.run(
      `INSERT INTO users (username, password_hash, full_name, role, created_at) VALUES 
       ('admin', 'admin123', 'Administrator', 'admin', ?),
       ('teacher', 'teacher123', 'Prof. Sarah Jenkins', 'teacher', ?)`,
      [now, now]
    );
  }

  // Seed default students if empty
  const studentCheck = db.exec("SELECT COUNT(*) as count FROM students;");
  const studentCount = studentCheck[0]?.values[0]?.[0] as number;
  if (!studentCount) {
    seedInitialStudents(db);
  }
}

function seedInitialStudents(db: Database) {
  const now = new Date().toISOString();
  const sampleStudents = [
    {
      student_id: 'CS-2026-001',
      full_name: 'Aria Chen',
      class_name: 'Computer Science 101',
      email: 'aria.chen@university.edu',
      image_path: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    },
    {
      student_id: 'CS-2026-002',
      full_name: 'Marcus Vance',
      class_name: 'Computer Science 101',
      email: 'm.vance@university.edu',
      image_path: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    },
    {
      student_id: 'CS-2026-003',
      full_name: 'Elena Rostova',
      class_name: 'Computer Science 101',
      email: 'elena.r@university.edu',
      image_path: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    },
    {
      student_id: 'CS-2026-004',
      full_name: 'Devon Malik',
      class_name: 'Computer Science 101',
      email: 'devon.malik@university.edu',
      image_path: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    },
    {
      student_id: 'CS-2026-005',
      full_name: 'Zoe Morales',
      class_name: 'Computer Science 101',
      email: 'zoe.m@university.edu',
      image_path: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
    },
    {
      student_id: 'AI-2026-006',
      full_name: 'Liam O’Connor',
      class_name: 'AI & Machine Learning',
      email: 'liam.oc@university.edu',
      image_path: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    },
    {
      student_id: 'AI-2026-007',
      full_name: 'Priya Sharma',
      class_name: 'AI & Machine Learning',
      email: 'priya.s@university.edu',
      image_path: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    }
  ];

  for (const s of sampleStudents) {
    db.run(
      `INSERT INTO students (student_id, full_name, class_name, email, face_encoding, image_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        s.student_id,
        s.full_name,
        s.class_name,
        s.email,
        JSON.stringify({
          features: [0.12, -0.45, 0.88, 0.33, -0.19],
          registered_at: now
        }),
        s.image_path,
        now
      ]
    );
  }

  // Pre-seed an initial session & sample attendance
  const today = new Date().toISOString().split('T')[0];
  db.run(
    `INSERT INTO attendance_sessions (class_name, session_date, session_name, created_by, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['Computer Science 101', today, 'Lecture 01 - Computer Vision & Neural Nets', 'Prof. Sarah Jenkins', now]
  );

  const sessionIdResult = db.exec("SELECT last_insert_rowid() as id;");
  const sessionId = sessionIdResult[0]?.values[0]?.[0] as number || 1;

  // Insert initial attendance for 4 present, 1 absent
  db.run(
    `INSERT INTO attendance (student_id, class_name, session_id, attendance_date, attendance_time, status, confidence, marked_by, audit_note, created_at)
     VALUES 
     ('CS-2026-001', 'Computer Science 101', ?, ?, '09:02:15', 'Present', 0.96, 'FaceRecognition Engine', 'Auto-detected via classroom photo', ?),
     ('CS-2026-002', 'Computer Science 101', ?, ?, '09:02:15', 'Present', 0.93, 'FaceRecognition Engine', 'Auto-detected via classroom photo', ?),
     ('CS-2026-003', 'Computer Science 101', ?, ?, '09:02:15', 'Present', 0.89, 'FaceRecognition Engine', 'Auto-detected via classroom photo', ?),
     ('CS-2026-004', 'Computer Science 101', ?, ?, '09:02:15', 'Present', 0.95, 'FaceRecognition Engine', 'Auto-detected via classroom photo', ?),
     ('CS-2026-005', 'Computer Science 101', ?, ?, '09:02:15', 'Absent', 0.0, 'Teacher Manual', 'Not detected in classroom image', ?)`,
    [sessionId, today, now, sessionId, today, now, sessionId, today, now, sessionId, today, now, sessionId, today, now]
  );
}
