import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { ChronoModal } from './components/ChronoModal';
import { NotificationModal } from './components/NotificationModal';
import { CommandPalette } from './components/CommandPalette';
import { QuickNotesDrawer } from './components/QuickNotesDrawer';
import { TaskModal } from './components/TaskModal';
import { DashboardPage } from './pages/DashboardPage';
import { CalendarPage } from './pages/CalendarPage';
import { TasksPage } from './pages/TasksPage';
import { ExamsPage } from './pages/ExamsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { ProfilePage } from './pages/ProfilePage';
import { ModulesPage } from './pages/ModulesPage';
import { AuthPage } from './pages/AuthPage';
import { Task, SmartNotification, Subject } from './types';
import { apiClient } from './lib/api';

export const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Derive activeTab from URL pathname so refresh and direct links work seamlessly
  const activeTab = useMemo(() => {
    const segment = location.pathname.replace(/^\//, '').split('/')[0].toLowerCase();
    return segment || 'dashboard';
  }, [location.pathname]);

  const handleNavigateTab = (tab: string) => {
    const target = tab.startsWith('/') ? tab : `/${tab === 'dashboard' ? '' : tab}`;
    navigate(target);
  };

  const [isChronoOpen, setIsChronoOpen] = useState(false);
  const [activeChronoTask, setActiveChronoTask] = useState<Task | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalPrefillTitle, setTaskModalPrefillTitle] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);

  // Hotkey listener for Ctrl+K (Command Palette) and Ctrl+J (Scratchpad)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsScratchpadOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleConvertNoteToTask = async (noteTitle: string) => {
    try {
      const res = await apiClient.getSubjects();
      setSubjects(res.subjects || []);
    } catch {}
    setTaskModalPrefillTitle(noteTitle);
    setIsTaskModalOpen(true);
  };

  const handleStartChronoForTask = (task: Task) => {
    setActiveChronoTask(task);
    setIsChronoOpen(true);
  };

  const handleOpenNotifications = async () => {
    try {
      const res = await apiClient.getNotifications();
      setNotifications(res.notifications || []);
      setIsNotificationsOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-indigo-600">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onOpenNotifications={handleOpenNotifications}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenScratchpad={() => setIsScratchpadOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleNavigateTab}
          onOpenChrono={() => {
            setActiveChronoTask(null);
            setIsChronoOpen(true);
          }}
        />

        {/* Page Content Viewport */}
        <main className={`flex-1 ${activeTab === 'ai' ? 'overflow-hidden flex flex-col p-0' : 'overflow-y-auto p-4 sm:p-6 lg:p-8'}`}>
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  onStartChronoForTask={handleStartChronoForTask}
                  onNavigateTab={handleNavigateTab}
                />
              }
            />
            <Route
              path="/dashboard"
              element={
                <DashboardPage
                  onStartChronoForTask={handleStartChronoForTask}
                  onNavigateTab={handleNavigateTab}
                />
              }
            />
            <Route
              path="/calendar"
              element={<CalendarPage onStartChronoForTask={handleStartChronoForTask} />}
            />
            <Route
              path="/tasks"
              element={<TasksPage onStartChronoForTask={handleStartChronoForTask} />}
            />
            <Route path="/exams" element={<ExamsPage />} />
            <Route path="/modules" element={<ModulesPage />} />
            <Route path="/ai" element={<AIAssistantPage />} />
            <Route path="/timetable" element={<ProfilePage initialSection="timetable" />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleNavigateTab}
        onOpenChrono={() => {
          setActiveChronoTask(null);
          setIsChronoOpen(true);
        }}
      />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={handleNavigateTab}
        onOpenChrono={() => {
          setActiveChronoTask(null);
          setIsChronoOpen(true);
        }}
        onOpenScratchpad={() => setIsScratchpadOpen(true)}
      />

      {/* Amphi Scratchpad Notes Drawer (Ctrl+J) */}
      <QuickNotesDrawer
        isOpen={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
        onConvertToTask={handleConvertNoteToTask}
      />

      {/* Task Creation Modal from Scratchpad conversion */}
      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setTaskModalPrefillTitle('');
          }}
          subjects={subjects}
          initialTitle={taskModalPrefillTitle}
          onTaskCreated={() => {
            setIsTaskModalOpen(false);
            setTaskModalPrefillTitle('');
          }}
        />
      )}

      {/* "Start Now / Do It Now" Chrono Modal */}
      <ChronoModal
        isOpen={isChronoOpen}
        onClose={() => setIsChronoOpen(false)}
        initialTask={activeChronoTask}
        onSessionLogged={() => {
          // Trigger any dashboard refresh
        }}
      />

      {/* Notifications Drawer */}
      <NotificationModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onRefresh={handleOpenNotifications}
      />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
