import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { FaceAttendance } from './components/FaceAttendance';
import { StudentRoster } from './components/StudentRoster';
import { AttendanceRecords } from './components/AttendanceRecords';
import { SecurityPolicyModal } from './components/SecurityPolicyModal';
import { LoginModal } from './components/LoginModal';
import { User } from './types';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function MainApp() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attendance' | 'students' | 'records'>('dashboard');
  const [currentUser, setCurrentUser] = useState<User>({
    id: 2,
    username: 'teacher',
    fullName: 'Prof. Sarah Jenkins',
    role: 'teacher',
  });

  const [isSecurityOpen, setIsSecurityOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [prefillRegisterName, setPrefillRegisterName] = useState<string | undefined>(undefined);

  const handleNavigateToRegister = (name?: string) => {
    setPrefillRegisterName(name);
    setActiveTab('students');
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${theme.bgClass}`}>
      {/* Top Navbar with Theme Switcher */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSecurity={() => setIsSecurityOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        currentUser={currentUser}
      />

      {/* Main Content Area with Animated Transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard
                onNavigate={(tab) => {
                  if (tab === 'security') {
                    setIsSecurityOpen(true);
                  } else {
                    setActiveTab(tab);
                  }
                }}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'attendance' && (
              <FaceAttendance
                currentUser={currentUser}
                onNavigateToRecords={() => setActiveTab('records')}
                onNavigateToRegister={handleNavigateToRegister}
              />
            )}

            {activeTab === 'students' && (
              <StudentRoster
                currentUser={currentUser}
                prefillName={prefillRegisterName}
              />
            )}

            {activeTab === 'records' && (
              <AttendanceRecords currentUser={currentUser} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className={`border-t py-6 text-center text-xs transition-colors duration-300 ${
        theme.isDark ? 'border-slate-900 bg-slate-950/80 text-slate-500' : 'border-slate-200 bg-slate-100/70 text-slate-500'
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>VisionAttend • Biometric Face Recognition Attendance Management</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSecurityOpen(true)}
              className="hover:underline transition"
              style={{ color: theme.primaryColor }}
            >
              Biometric Safeguards & Retention Policy
            </button>
            <span>•</span>
            <span>Active Theme: {theme.name}</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SecurityPolicyModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
