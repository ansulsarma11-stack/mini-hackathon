import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { getDb, saveDb } from './src/server/db.ts';
import { matchClassroomFaces, validateStudentPhoto } from './src/server/faceService.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// High limit for base64 classroom photographs
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = await getDb();
    const result = db.exec('SELECT id, username, full_name, role, password_hash FROM users WHERE username = ?', [username]);
    
    if (!result.length || !result[0].values.length) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const row = result[0].values[0];
    const user = {
      id: row[0],
      username: row[1],
      fullName: row[2],
      role: row[3],
      passwordHash: row[4],
    };

    if (user.passwordHash !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List distinct classes
app.get('/api/classes', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT DISTINCT class_name FROM students ORDER BY class_name ASC');
    const classes = result.length ? result[0].values.map((v) => v[0] as string) : ['Computer Science 101', 'AI & Machine Learning'];
    res.json({ classes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Students CRUD
app.get('/api/students', async (req, res) => {
  try {
    const { className, search } = req.query;
    const db = await getDb();
    
    let query = 'SELECT id, student_id, full_name, class_name, email, image_path, created_at FROM students';
    const params: any[] = [];
    const conditions: string[] = [];

    if (className && className !== 'all') {
      conditions.push('class_name = ?');
      params.push(className);
    }
    if (search) {
      conditions.push('(full_name LIKE ? OR student_id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY full_name ASC';

    const result = db.exec(query, params);
    if (!result.length) {
      return res.json({ students: [] });
    }

    const cols = result[0].columns;
    const students = result[0].values.map((row) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

    res.json({ students });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Validate student photo
app.post('/api/face/validate-photo', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ valid: false, message: 'No image data provided' });
    }
    const validation = await validateStudentPhoto(imageBase64);
    res.json(validation);
  } catch (err: any) {
    res.status(500).json({ valid: false, message: err.message });
  }
});

// Register new student
app.post('/api/students', async (req, res) => {
  try {
    const { student_id, full_name, class_name, email, image_path } = req.body;
    if (!student_id || !full_name || !class_name || !image_path) {
      return res.status(400).json({ error: 'Missing required student details or photo' });
    }

    const db = await getDb();

    // Check duplicate student_id
    const existing = db.exec('SELECT id FROM students WHERE student_id = ?', [student_id]);
    if (existing.length && existing[0].values.length) {
      return res.status(400).json({ error: `Student ID "${student_id}" is already registered.` });
    }

    // Validate face in photo
    const validation = await validateStudentPhoto(image_path);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    const now = new Date().toISOString();
    const faceEncodingJson = JSON.stringify({
      encoding: validation.encoding || [],
      extracted_at: now,
    });

    db.run(
      `INSERT INTO students (student_id, full_name, class_name, email, face_encoding, image_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [student_id, full_name, class_name, email || '', faceEncodingJson, image_path, now]
    );
    saveDb();

    res.status(201).json({
      success: true,
      message: `Student ${full_name} registered successfully with biometric face encoding.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete student
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    db.run('DELETE FROM students WHERE id = ?', [id]);
    saveDb();
    res.json({ success: true, message: 'Student removed from database' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Attendance Sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(`
      SELECT s.id, s.class_name, s.session_date, s.session_name, s.created_by, s.created_at,
             COUNT(a.id) as total_marked,
             SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_count
      FROM attendance_sessions s
      LEFT JOIN attendance a ON s.id = a.session_id
      GROUP BY s.id
      ORDER BY s.id DESC
    `);

    if (!result.length) {
      return res.json({ sessions: [] });
    }

    const cols = result[0].columns;
    const sessions = result[0].values.map((row) => {
      const obj: any = {};
      cols.forEach((c, idx) => {
        obj[c] = row[idx];
      });
      return obj;
    });

    res.json({ sessions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const { class_name, session_date, session_name, created_by } = req.body;
    if (!class_name || !session_date || !session_name) {
      return res.status(400).json({ error: 'Missing session details' });
    }

    const db = await getDb();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO attendance_sessions (class_name, session_date, session_name, created_by, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [class_name, session_date, session_name, created_by || 'Teacher', now]
    );

    const idResult = db.exec('SELECT last_insert_rowid() as id');
    const sessionId = idResult[0]?.values[0]?.[0];
    saveDb();

    res.status(201).json({ success: true, sessionId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Face Detection and Matching for Classroom Photo
app.post('/api/face/detect-and-match', async (req, res) => {
  try {
    const { imageBase64, className, threshold } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No classroom image uploaded' });
    }

    const db = await getDb();

    // Fetch registered students in this class
    let query = 'SELECT student_id, full_name, image_path FROM students';
    const params: any[] = [];
    if (className && className !== 'all') {
      query += ' WHERE class_name = ?';
      params.push(className);
    }

    const result = db.exec(query, params);
    const enrolledStudents = result.length
      ? result[0].values.map((row) => ({
          student_id: row[0] as string,
          full_name: row[1] as string,
          image_path: row[2] as string,
        }))
      : [];

    const numThreshold = threshold ? parseFloat(threshold) : 0.70;
    const matches = await matchClassroomFaces(imageBase64, enrolledStudents, numThreshold);

    // Also return list of students not detected so teacher can review absentees
    const matchedIds = new Set(matches.map((m) => m.studentId).filter(Boolean));
    const absentStudents = enrolledStudents.filter((s) => !matchedIds.has(s.student_id));

    res.json({
      matches,
      enrolledCount: enrolledStudents.length,
      detectedCount: matches.length,
      recognizedCount: matches.filter((m) => m.matchType === 'recognized').length,
      uncertainCount: matches.filter((m) => m.matchType === 'uncertain').length,
      unknownCount: matches.filter((m) => m.matchType === 'unknown').length,
      absentStudents,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Submit Attendance batch
app.post('/api/attendance/submit', async (req, res) => {
  try {
    const { sessionId, className, records, markedBy } = req.body;
    if (!sessionId || !className || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Invalid attendance submission payload' });
    }

    const db = await getDb();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    let inserted = 0;
    let updated = 0;

    for (const rec of records) {
      if (!rec.studentId) continue;

      // Check if attendance already exists for this student and session (Duplicate Prevention)
      const existing = db.exec(
        'SELECT id, status FROM attendance WHERE student_id = ? AND session_id = ?',
        [rec.studentId, sessionId]
      );

      if (existing.length && existing[0].values.length) {
        // Update existing record
        const attId = existing[0].values[0][0];
        db.run(
          `UPDATE attendance 
           SET status = ?, confidence = ?, marked_by = ?, audit_note = ?, attendance_time = ?
           WHERE id = ?`,
          [
            rec.status,
            rec.confidence || 1.0,
            markedBy || 'Teacher',
            rec.auditNote || 'Manual update during session review',
            timeStr,
            attId,
          ]
        );
        updated++;
      } else {
        // Insert new record
        db.run(
          `INSERT INTO attendance 
           (student_id, class_name, session_id, attendance_date, attendance_time, status, confidence, marked_by, audit_note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            rec.studentId,
            className,
            sessionId,
            dateStr,
            timeStr,
            rec.status || 'Present',
            rec.confidence || 1.0,
            markedBy || 'Teacher',
            rec.auditNote || 'Automated facial recognition match',
            now.toISOString(),
          ]
        );
        inserted++;
      }
    }

    saveDb();
    res.json({
      success: true,
      message: `Attendance recorded: ${inserted} new records, ${updated} updated records.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Query Attendance Records
app.get('/api/attendance/records', async (req, res) => {
  try {
    const { date, className, studentId, sessionId } = req.query;
    const db = await getDb();

    let query = `
      SELECT a.id, a.student_id, s.full_name, a.class_name, a.session_id,
             sess.session_name, a.attendance_date, a.attendance_time, a.status,
             a.confidence, a.marked_by, a.audit_note, a.created_at, s.image_path
      FROM attendance a
      JOIN students s ON a.student_id = s.student_id
      LEFT JOIN attendance_sessions sess ON a.session_id = sess.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (date) {
      conditions.push('a.attendance_date = ?');
      params.push(date);
    }
    if (className && className !== 'all') {
      conditions.push('a.class_name = ?');
      params.push(className);
    }
    if (studentId) {
      conditions.push('a.student_id = ?');
      params.push(studentId);
    }
    if (sessionId) {
      conditions.push('a.session_id = ?');
      params.push(sessionId);
    }

    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY a.attendance_date DESC, a.attendance_time DESC';

    const result = db.exec(query, params);
    if (!result.length) {
      return res.json({ records: [] });
    }

    const cols = result[0].columns;
    const records = result[0].values.map((row) => {
      const obj: any = {};
      cols.forEach((c, idx) => {
        obj[c] = row[idx];
      });
      return obj;
    });

    res.json({ records });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update single attendance record with audit trail
app.put('/api/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, auditNote, updatedBy } = req.body;
    const db = await getDb();

    const note = `${auditNote || 'Status changed'} (Modified by ${updatedBy || 'Teacher'} at ${new Date().toLocaleTimeString()})`;
    db.run(
      'UPDATE attendance SET status = ?, audit_note = ? WHERE id = ?',
      [status, note, id]
    );
    saveDb();
    res.json({ success: true, message: 'Attendance record updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export attendance CSV
app.get('/api/attendance/export', async (req, res) => {
  try {
    const { className, date } = req.query;
    const db = await getDb();

    let query = `
      SELECT a.id, a.student_id, s.full_name, a.class_name, sess.session_name,
             a.attendance_date, a.attendance_time, a.status, a.confidence,
             a.marked_by, a.audit_note
      FROM attendance a
      JOIN students s ON a.student_id = s.student_id
      LEFT JOIN attendance_sessions sess ON a.session_id = sess.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];
    if (className && className !== 'all') {
      conditions.push('a.class_name = ?');
      params.push(className);
    }
    if (date) {
      conditions.push('a.attendance_date = ?');
      params.push(date);
    }
    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY a.attendance_date DESC, a.attendance_time DESC';

    const result = db.exec(query, params);
    if (!result.length || !result[0].values.length) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
      return res.send('Record ID,Student ID,Student Name,Class,Session,Date,Time,Status,Confidence,Marked By,Audit Note\n');
    }

    const rows = result[0].values;
    const csvLines = [
      'Record ID,Student ID,Student Name,Class,Session,Date,Time,Status,Confidence,Marked By,Audit Note',
    ];

    rows.forEach((row) => {
      const escaped = row.map((field) => {
        const str = String(field ?? '');
        return `"${str.replace(/"/g, '""')}"`;
      });
      csvLines.push(escaped.join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvLines.join('\n'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Analytics Dashboard statistics
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];

    // Total registered students
    const totalStudentsResult = db.exec('SELECT COUNT(*) FROM students');
    const totalStudents = (totalStudentsResult[0]?.values[0]?.[0] as number) || 0;

    // Today's attendance counts
    const todayPresentResult = db.exec(
      "SELECT COUNT(DISTINCT student_id) FROM attendance WHERE attendance_date = ? AND status = 'Present'",
      [today]
    );
    const presentToday = (todayPresentResult[0]?.values[0]?.[0] as number) || 0;

    const todayAbsentResult = db.exec(
      "SELECT COUNT(DISTINCT student_id) FROM attendance WHERE attendance_date = ? AND status = 'Absent'",
      [today]
    );
    const absentToday = (todayAbsentResult[0]?.values[0]?.[0] as number) || 0;

    const attendanceRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;

    // Recent activities (latest 8 attendance marks)
    const recentResult = db.exec(`
      SELECT a.id, a.student_id, s.full_name, a.class_name, a.status, a.confidence, a.attendance_time, a.marked_by
      FROM attendance a
      JOIN students s ON a.student_id = s.student_id
      ORDER BY a.id DESC
      LIMIT 8
    `);

    const recentActivity = recentResult.length
      ? recentResult[0].values.map((row) => ({
          id: row[0],
          studentId: row[1],
          studentName: row[2],
          className: row[3],
          status: row[4],
          confidence: row[5],
          time: row[6],
          markedBy: row[7],
        }))
      : [];

    // Class distribution
    const classDistResult = db.exec(`
      SELECT class_name, COUNT(*) as student_count
      FROM students
      GROUP BY class_name
    `);
    const classDistribution = classDistResult.length
      ? classDistResult[0].values.map((row) => ({
          className: row[0],
          count: row[1],
        }))
      : [];

    res.json({
      totalStudents,
      presentToday,
      absentToday,
      attendanceRate,
      recentActivity,
      classDistribution,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mount Vite middleware in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Face Recognition Attendance System server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
